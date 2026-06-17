const express = require("express");
const app = express();

const http = require("http").createServer(app);

const io = require("socket.io")(http, {
    cors: {
        origin: "*"
    }
});

let participantes = [];

let participanteSelecionado = null;

io.on("connection", (socket) => {

    console.log("Conectado:", socket.id);

    // Participante entrou
    socket.on("entrar", (dados) => {

        const participante = {
            id: socket.id,
            nome: dados.nome || "Sem nome"
        };

        participantes.push(participante);

        io.emit("fila", participantes);

    });

    // Admin selecionou alguém
    socket.on("selecionar", (id) => {

        participanteSelecionado = id;

        io.emit("participanteSelecionado", id);

        console.log("Selecionado:", id);

    });

    // =====================
    // WEBRTC
    // =====================

    socket.on("offer", (data) => {

        io.to(data.target).emit("offer", {
            offer: data.offer,
            sender: socket.id
        });

    });

    socket.on("answer", (data) => {

        io.to(data.target).emit("answer", {
            answer: data.answer,
            sender: socket.id
        });

    });

    socket.on("ice-candidate", (data) => {

        io.to(data.target).emit("ice-candidate", {
            candidate: data.candidate,
            sender: socket.id
        });

    });

    // =====================

    socket.on("disconnect", () => {

        participantes = participantes.filter(
            p => p.id !== socket.id
        );

        if (participanteSelecionado === socket.id) {
            participanteSelecionado = null;
        }

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
