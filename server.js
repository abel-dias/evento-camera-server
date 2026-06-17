const express = require("express");
const app = express();

const http = require("http").createServer(app);

const io = require("socket.io")(http, {
  cors: {
    origin: "*"
  }
});

let participantes = [];

io.on("connection", (socket) => {

  console.log("Conectado:", socket.id);

  socket.on("entrar", (dados) => {

    participantes.push({
      id: socket.id,
      nome: dados.nome
    });

    io.emit("fila", participantes);

  });

  socket.on("selecionar", (id) => {

    io.emit("participanteSelecionado", id);

  });

  socket.on("disconnect", () => {

    participantes = participantes.filter(
      p => p.id !== socket.id
    );

    io.emit("fila", participantes);

    console.log("Desconectado:", socket.id);

  });

});

app.get("/", (req, res) => {
  res.send("Servidor Online");
});

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
