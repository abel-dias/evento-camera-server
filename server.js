const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const participantes = new Map();
let telaoId = null;

function getFilaParticipantes() {
  return Array.from(participantes.values());
}

function atualizarFila() {
  io.emit("fila", getFilaParticipantes());
}

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  socket.on("registrarTelao", () => {
    telaoId = socket.id;
    console.log("Telão registrado:", telaoId);

    socket.emit("telaoRegistrado");
    atualizarFila();
  });

  socket.on("registrarAdmin", () => {
    console.log("Admin registrado:", socket.id);
    socket.emit("fila", getFilaParticipantes());
  });

  socket.on("entrar", (dados = {}) => {
    const nome =
      dados.nome && dados.nome.trim() !== ""
        ? dados.nome.trim()
        : "Participante";

    const participante = {
      id: socket.id,
      nome: nome,
      entrouEm: Date.now()
    };

    participantes.set(socket.id, participante);

    console.log("Participante entrou:", participante);

    socket.emit("entradaConfirmada", participante);
    atualizarFila();
  });

  socket.on("selecionar", (idParticipante) => {
    const participante = participantes.get(idParticipante);

    if (!participante) {
      socket.emit("erroSelecao", "Participante não encontrado.");
      return;
    }

    if (!telaoId) {
      socket.emit("erroSelecao", "O telão ainda não está conectado.");
      return;
    }

    console.log("Participante selecionado:", participante.nome);

    io.to(telaoId).emit("esconderQRCodeTelao");

    io.to(telaoId).emit("iniciarVideo", {
      participante: participante
    });

    io.to(idParticipante).emit("voceFoiSelecionado", {
      telaoId: telaoId,
      participante: participante
    });

    io.emit("participanteSelecionado", participante);
  });

  socket.on("mostrarQRCodeTelao", (dados = {}) => {
    if (!telaoId) {
      socket.emit("erroSelecao", "O telão ainda não está conectado.");
      return;
    }

    const texto =
      dados.texto && dados.texto.trim() !== ""
        ? dados.texto.trim()
        : "Entre para participar do sorteio!";

    console.log("Mostrar QR Code no telão:", texto);

    io.to(telaoId).emit("mostrarQRCodeTelao", {
      texto: texto
    });
  });

  socket.on("esconderQRCodeTelao", () => {
    if (telaoId) {
      console.log("Esconder QR Code no telão");
      io.to(telaoId).emit("esconderQRCodeTelao");
    }
  });

  socket.on("offer", (data) => {
    if (!data || !data.target || !data.offer) return;

    io.to(data.target).emit("offer", {
      sender: socket.id,
      offer: data.offer
    });
  });

  socket.on("answer", (data) => {
    if (!data || !data.target || !data.answer) return;

    io.to(data.target).emit("answer", {
      sender: socket.id,
      answer: data.answer
    });
  });

  socket.on("ice-candidate", (data) => {
    if (!data || !data.target || !data.candidate) return;

    io.to(data.target).emit("ice-candidate", {
      sender: socket.id,
      candidate: data.candidate
    });
  });

  socket.on("pararTransmissao", (idParticipante) => {
    console.log("Parar transmissão:", idParticipante);

    if (idParticipante) {
      io.to(idParticipante).emit("pararTransmissao");
    }

    if (telaoId) {
      io.to(telaoId).emit("limparTelao");
      io.to(telaoId).emit("esconderQRCodeTelao");
    }
  });

  socket.on("disconnect", () => {
    console.log("Desconectado:", socket.id);

    if (socket.id === telaoId) {
      telaoId = null;
      console.log("Telão desconectado");
    }

    if (participantes.has(socket.id)) {
      participantes.delete(socket.id);
      atualizarFila();
    }

    io.emit("usuarioDesconectado", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Servidor Online - Evento Câmera");
});

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    participantes: participantes.size,
    telaoConectado: !!telaoId
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
