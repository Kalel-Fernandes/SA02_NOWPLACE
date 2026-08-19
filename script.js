let stream = null;
let etapa = 1;
let fotoAmbiente = null;
let fotoSelfie = null;
let localizacao = "Buscando localização...";

const camera = document.querySelector("#cameraOverlay");
const video = document.querySelector("#cameraVideo");
const canvas = document.querySelector("#captureCanvas");

document.querySelector("#fabBtn").onclick = async () => {
    etapa = 1;
    document.querySelector("#cameraStepText").textContent = "1/2 · AMBIENTE";
    document.querySelector("#cameraHint").textContent = "Mostre onde você está";
    camera.classList.remove("hidden");
    await iniciarCamera("environment");
    pegarLocalizacao();
};

async function iniciarCamera(tipo) {
    pararCamera();
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: tipo
            },
            audio: false
        });
        video.srcObject = stream;
        await video.play();
    } catch (erro) {
        alert("Não foi possível acessar a câmera.");
        console.error(erro);
    }
}

function pararCamera() {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
        stream = null;
    }
}

document.querySelector("#shutterBtn").onclick = async () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexto = canvas.getContext("2d");
    contexto.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );
    const foto = canvas.toDataURL("image/jpeg");

    if (etapa === 1) {
        fotoAmbiente = foto;
        etapa = 2;
        document.querySelector("#cameraStepText").textContent =
            "2/2 · SELFIE";
        document.querySelector("#cameraHint").textContent =
            "Agora tire uma selfie";
        await iniciarCamera("user");
    } else {
        fotoSelfie = foto;
        pararCamera();
        camera.classList.add("hidden");
        salvarNow();
    }
};

document.querySelector("#cameraCancelBtn").onclick = () => {
    pararCamera();
    camera.classList.add("hidden");
};

function pegarLocalizacao() {
    if (!navigator.geolocation) {
        localizacao = "Localização indisponível";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (posicao) => {
            const lat = posicao.coords.latitude;
            const lon = posicao.coords.longitude;

            try {
                const resposta = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
                );
                const dados = await resposta.json();
                const cidade =
                    dados.address.city ||
                    dados.address.town ||
                    dados.address.village ||
                    "";
                const bairro =
                    dados.address.suburb ||
                    dados.address.neighbourhood ||
                    "";
                localizacao = bairro
                    ? `${bairro}, ${cidade}`
                    : cidade || "Localização atual";
            } catch {
                localizacao = "Localização atual";
            }
        },
        () => {localizacao = "Localização indisponível";}
    );
}

function salvarNow() {
    const posts = JSON.parse(
        localStorage.getItem("nowplace_posts") || "[]"
    );

    const novoPost = {
        id: Date.now(),
        fotoAmbiente: fotoAmbiente,
        fotoSelfie: fotoSelfie,
        local: localizacao,
        timestamp: Date.now(),
        principal: "ambiente"
    };
    posts.unshift(novoPost);
    localStorage.setItem(
        "nowplace_posts",
        JSON.stringify(posts)
    );

    localStorage.setItem(
        "nowplace_last_post",
        Date.now()
    );
    fotoAmbiente = null;
    fotoSelfie = null;
    mostrarNows();
}

function podeVerNows() {
    const ultimoPost =localStorage.getItem("nowplace_last_post");

    if (!ultimoPost) {
        return false;
    }

    const vinteQuatroHoras = 24 * 60 * 60 * 1000;
    return (
        Date.now() - Number(ultimoPost)
        < vinteQuatroHoras
    );
}

function mostrarNows() {
    const content =
        document.querySelector("#content");

    content.innerHTML = "";

    if (!podeVerNows()) {
        content.innerHTML = `
            <div class="bloqueado">
                <h2>🔒 Feed bloqueado</h2>
                <p>Faça um Now para poder visualizar os Nows.</p>
            </div>
        `;
        return;
    }

    const posts = JSON.parse(
        localStorage.getItem("nowplace_posts") || "[]"
    );

    posts.forEach(post => {
        content.appendChild(
            criarPolaroid(post)
        );
    });
}

function criarPolaroid(post) {
    const card =
        document.createElement("div");
    card.className = "polaroid";

    const fotoPrincipal =
        post.principal === "selfie"
            ? post.fotoSelfie
            : post.fotoAmbiente;

    const fotoSecundaria =
        post.principal === "selfie"
            ? post.fotoAmbiente
            : post.fotoSelfie;

    card.innerHTML = `
        <div class="foto-polaroid">
            <img class="foto-principal" src="${fotoPrincipal}">
            <img class="foto-secundaria" src="${fotoSecundaria}" draggable="true">
        </div>
        <div class="polaroid-info">
            <strong>📍 ${post.local}</strong>
            <small>
                ${new Date(post.timestamp)
                    .toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                    })}
            </small>
        </div>
    `;
    configurarDrag(card, post);
    return card;
}

function configurarDrag(card, post) {
    const principal = card.querySelector(".foto-principal");
    const secundaria = card.querySelector(".foto-secundaria");

    secundaria.addEventListener(
        "dragstart",
        event => {
            event.dataTransfer.setData(
                "foto",
                secundaria.src
            );
        }
    );
    principal.addEventListener(
        "dragover",
        event => {
            event.preventDefault();
        }
    );
    principal.addEventListener(
        "drop",
        event => {
            event.preventDefault();
            const fotoArrastada = event.dataTransfer.getData("foto");
            const fotoAntiga = principal.src;
            principal.src = fotoArrastada;
            secundaria.src = fotoAntiga;

            if (post.principal === "ambiente") {
                post.principal = "selfie";
            } else {
                post.principal = "ambiente";
            }
            const posts = JSON.parse(
                localStorage.getItem("nowplace_posts")
            );
            const index =
                posts.findIndex(p => p.id === post.id);
            if (index !== -1) {
                posts[index] = post;
                localStorage.setItem(
                    "nowplace_posts",
                    JSON.stringify(posts)
                );
            }
        }
    );
}
mostrarNows();