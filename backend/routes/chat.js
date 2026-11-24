const express = require("express");
const Message = require("../models/Message");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/chat/conversations - List user conversations
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all messages involving the user
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "username avatarUrl")
      .populate("recipient", "username avatarUrl");

    // Group by other user
    const conversationMap = new Map();

    messages.forEach((msg) => {
      const isSender = msg.sender._id.toString() === userId.toString();
      const otherUser = isSender ? msg.recipient : msg.sender;
      if (!otherUser) return;

      const otherId = otherUser._id.toString();

      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, {
          userId: otherId,
          username: otherUser.username,
          avatarUrl: otherUser.avatarUrl || "",
          lastMessage: msg.text || (msg.isSnap ? "📷 Snap" : "Sent a photo"),
          lastMessageTime: msg.createdAt,
          unread: !isSender && !msg.opened,
        });
      }
    });

    const conversations = Array.from(conversationMap.values());
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Fetch conversations error:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// GET /api/chat/:userId - Message history with a specific user
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const theirId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: theirId },
        { sender: theirId, recipient: myId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100);

    // Mark received messages as opened
    await Message.updateMany(
      { sender: theirId, recipient: myId, opened: false },
      { $set: { opened: true } }
    );

    const formatted = messages.map((m) => ({
      id: m._id,
      _id: m._id,
      senderId: m.sender.toString(),
      recipientId: m.recipient.toString(),
      isMe: m.sender.toString() === myId.toString(),
      text: m.text,
      mediaUrl: m.mediaUrl,
      isSnap: m.isSnap,
      opened: m.opened,
      createdAt: m.createdAt,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Fetch chat history error:", error);
    res.status(500).json({ message: "Failed to load messages" });
  }
});

// POST /api/chat/:userId - Send a message or snap
router.post("/:userId", authMiddleware, async (req, res) => {
  try {
    const senderId = req.user.id;
    const recipientId = req.params.userId;
    const { text, mediaUrl, isSnap } = req.body;

    if (!text && !mediaUrl) {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient user not found" });
    }

    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      text: text ? String(text).trim() : "",
      mediaUrl: mediaUrl || "",
      isSnap: Boolean(isSnap),
      opened: false,
    });

    res.status(201).json({
      message: "Message sent",
      data: {
        id: message._id,
        _id: message._id,
        senderId,
        recipientId,
        isMe: true,
        text: message.text,
        mediaUrl: message.mediaUrl,
        isSnap: message.isSnap,
        opened: message.opened,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

module.exports = router;
