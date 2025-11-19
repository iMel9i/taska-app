import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

// --------------------- Socket.IO реал-тайм ---------------------
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Присоединяемся к комнате группы (chatId из Telegram)
  socket.on("join-project", (chatId: string) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined project ${chatId}`);
  });

  // Создание задачи
  socket.on("task-create", async (data) => {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        quadrant: data.quadrant,
        assigneeId: data.assigneeId ?? null,
        assigneeName: data.assigneeName ?? null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        project: { connect: { chatId: BigInt(data.chatId) } },
      },
      include: { comments: true },
    });
    io.to(data.chatId).emit("task-created", task);
  });

  // Перемещение по матрице
  socket.on("task-move", async ({ taskId, quadrant, chatId }) => {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { quadrant },
    });
    io.to(chatId).emit("task-moved", task);
  });

  // Обновление задачи
  socket.on("task-update", async (data) => {
    const task = await prisma.task.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId ?? null,
        assigneeName: data.assigneeName ?? null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        quadrant: data.quadrant,
      },
    });
    io.to(data.chatId).emit("task-updated", task);
  });

  // Удаление задачи
  socket.on("task-delete", async ({ taskId, chatId }) => {
    await prisma.task.delete({ where: { id: taskId } });
    io.to(chatId).emit("task-deleted", taskId);
  });

  // Комментарий
  socket.on("comment-add", async (data) => {
    const comment = await prisma.comment.create({
      data: {
        text: data.text,
        authorId: BigInt(data.authorId),
        authorName: data.authorName,
        task: { connect: { id: data.taskId } },
      },
    });
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      include: { comments: true },
    });
    io.to(data.chatId).emit("comment-added", task);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// --------------------- REST API (для загрузки начальных данных) ---------------------
app.get("/project/:chatId", async (req, res) => {
  const { chatId } = req.params;
  let project = await prisma.project.findUnique({
    where: { chatId: BigInt(chatId) },
    include: { tasks: { include: { comments: true } } },
  });

  if (!project) {
    project = await prisma.project.create({
      data: { chatId: BigInt(chatId) },
      include: { tasks: { include: { comments: true } } },
    });
  }

  res.json(project);
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Backend работает на порту ${PORT}`);
}); 
