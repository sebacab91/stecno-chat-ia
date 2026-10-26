const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages");
const newChatButton = document.getElementById("new-chat");

// Guarda el historial de la conversación para mandárselo a Gemini en cada mensaje
let conversationHistory = [];

// Agrega un mensaje a la conversación
function addMessage(text, sender) {
    // Si todavía está visible la bienvenida, la quitamos
    const welcome = messagesContainer.querySelector(".welcome");

    if (welcome) {
        welcome.remove();
    }

    const message = document.createElement("div");

    message.classList.add("message", sender);
    message.textContent = text;

    messagesContainer.appendChild(message);

    // Desplaza el chat hasta el último mensaje
    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}

// Enviar mensaje al backend
async function sendMessage(message) {

    // Agregamos el mensaje del usuario al historial
    conversationHistory.push({ role: "user", text: message });

    try {

        const response = await fetch(
            "/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    history: conversationHistory
                })
            }
        );

        const data = await response.json();

        console.log("Respuesta del backend:", data);

       if (!response.ok || !data.success) {
            throw new Error(data.message || "Error del servidor");
        }

        // Agregamos la respuesta de la IA al historial también
        conversationHistory.push({ role: "model", text: data.response });

        addMessage(data.response, "assistant");

    } catch (error) {

        console.error(
            "Error al comunicarse con el backend:",
            error
        );

        addMessage(
            "No se pudo conectar con el servidor.",
            "assistant"
        );
    }
}

// Envío del formulario
chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = messageInput.value.trim();

    if (!text) return;

    // Mostrar inmediatamente el mensaje del usuario
    addMessage(text, "user");

    // Limpiar input
    messageInput.value = "";
    messageInput.focus();

     // Enviar al backend
    await sendMessage(text);
});

// Nuevo chat
newChatButton.addEventListener("click", () => {
    conversationHistory = [];

    messagesContainer.innerHTML = `
        <div class="welcome">
            <div class="welcome-icon">ST</div>
            <h2>¿En qué proyecto estás pensando?</h2>
            <p>
                Contame qué querés resolver y te hago
                algunas preguntas para entender la magnitud.
            </p>
        </div>
    `;

    messageInput.focus();
});