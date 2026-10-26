const express = require("express");

const { generateResponse } = require("../services/gemini.service");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { history } = req.body;

        if (!history || !Array.isArray(history) || history.length === 0) {
            return res.status(400).json({
                success: false,
                message: "El historial no puede estar vacío."
            });
        }

        const response = await generateResponse(history);

        res.json({
            success: true,
            response
        });

    } catch (error) {
        console.error("Error al consultar Gemini:", error.message);

        res.status(500).json({
            success: false,
            message: "No se pudo obtener una respuesta de la IA."
        });
    }
});

module.exports = router;