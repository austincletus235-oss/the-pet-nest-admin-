const SUPABASE_URL = "https://mbpdimmuuzrxgsraofew.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icGRpbW11dXpyeGdzcmFvZmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDYwNjAsImV4cCI6MjA5MTk4MjA2MH0.g54oYMrrChSGr_fRpMwFIYp5LAQcV1hzIJqvRXpjj6E";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginCard = document.getElementById("loginCard");
const app = document.getElementById("app");
const logoutBtn = document.getElementById("logoutBtn");
const loginMsg = document.getElementById("loginMsg");
const addMsg = document.getElementById("addMsg");
const petsBody = document.getElementById("petsBody");

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  const session = data?.session;

  if (session) {
    loginCard.classList.add("hidden");
    app.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    await loadPets();
  } else {
    loginCard.classList.remove("hidden");
    app.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
}

document.getElementById("loginBtn").onclick = async () => {
  loginMsg.textContent = "Logging in...";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginMsg.textContent = "Login failed: " + error.message;
  } else {
    loginMsg.textContent = "Login success";
    await checkSession();
  }
};

logoutBtn.onclick = async () => {
  await supabaseClient.auth.signOut();
  await checkSession();
};

function formatPrice(value) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadPets() {
  const { data, error } = await supabaseClient
    .from("pets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    petsBody.innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
    return;
  }

  petsBody.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.media_url ? `<a href="${p.media_url}" target="_blank" rel="noopener noreferrer">View</a>` : "—"}</td>
      <td>${p.name || ""}</td>
      <td>$${formatPrice(p.price)}</td>
      <td>${p.category || ""}</td>
      <td>${p.section || ""}</td>
      <td>${p.status || ""}</td>
      <td>
        <button class="btn sold-btn" data-id="${p.id}">Mark Sold</button>
        <button class="btn del-btn" data-id="${p.id}" data-media="${p.media_path || ""}">Delete</button>
      </td>
    `;
    petsBody.appendChild(tr);
  });

  document.querySelectorAll(".sold-btn").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const { error } = await supabaseClient.from("pets").update({ status: "sold" }).eq("id", id);
      if (error) return alert(error.message);
      await loadPets();
    };
  });

  document.querySelectorAll(".del-btn").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const mediaPath = btn.getAttribute("data-media");

      if (!confirm("Delete this pet?")) return;

      if (mediaPath) {
        await supabaseClient.storage.from("pet-media").remove([mediaPath]);
      }

      const { error } = await supabaseClient.from("pets").delete().eq("id", id);
      if (error) return alert(error.message);

      await loadPets();
    };
  });
}

document.getElementById("addPetBtn").onclick = async () => {
  addMsg.textContent = "Adding pet...";

  const name = document.getElementById("name").value.trim();
  const price = Number(document.getElementById("price").value || 0);
  const category = document.getElementById("category").value;
  const section = document.getElementById("section").value; // IMPORTANT
  const status = document.getElementById("status").value;
  const description = document.getElementById("description").value.trim();
  const file = document.getElementById("media").files[0];

  if (!name) {
    addMsg.textContent = "Name is required.";
    return;
  }

  if (file && !file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    addMsg.textContent = "Only image/video files are allowed.";
    return;
  }

  // Create row first
  const { data: created, error: insertErr } = await supabaseClient
    .from("pets")
    .insert([{ name, price, category, section, status, description }]) // includes section
    .select()
    .single();

  if (insertErr) {
    addMsg.textContent = "Insert error: " + insertErr.message;
    return;
  }

  // Optional media upload
  if (file) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const media_path = `${created.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabaseClient.storage
      .from("pet-media")
      .upload(media_path, file, { upsert: true });

    if (uploadErr) {
      // cleanup inserted row if upload failed
      await supabaseClient.from("pets").delete().eq("id", created.id);
      addMsg.textContent = "Upload error: " + uploadErr.message;
      return;
    }

    const { data: pub } = supabaseClient.storage.from("pet-media").getPublicUrl(media_path);
    const media_url = pub?.publicUrl || "";

    const { error: updateErr } = await supabaseClient
      .from("pets")
      .update({ media_url, media_path })
      .eq("id", created.id);

    if (updateErr) {
      addMsg.textContent = "DB media save error: " + updateErr.message;
      return;
    }
  }

  addMsg.textContent = "Pet added successfully.";

  document.getElementById("name").value = "";
  document.getElementById("price").value = "";
  document.getElementById("description").value = "";
  document.getElementById("media").value = "";

  await loadPets();
};

checkSession();
