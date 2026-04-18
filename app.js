// --- 1. INITIALIZE SUPABASE ---
const supabaseUrl = 'https://mbpdimmuuzrxgsraofew.supabase.co';
const supabaseKey = 'sb_publishable_KIu8B6ZxNI0y03L2MXszQQ_bfHS-n-k';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. AUTHENTICATION LOGIC ---
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        document.getElementById('login-error').innerText = error.message;
    } else {
        document.getElementById('login-section').classList.remove('active');
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        loadDashboardStats();
        loadPets();
    }
}

async function logout() {
    await supabase.auth.signOut();
    window.location.reload(); // Refresh to show login screen
}

// Check if already logged in on page load
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('login-section').classList.remove('active');
        document.getElementById('dashboard-section').classList.remove('hidden');
        loadDashboardStats();
        loadPets();
    }
});

// --- 3. UI ROUTING ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    
    const selectedTab = document.getElementById(tabId);
    selectedTab.classList.remove('hidden');
    selectedTab.classList.add('active');

    if(tabId === 'dashboard-tab') loadDashboardStats();
    if(tabId === 'manage-tab') loadPets();
}

// --- 4. DASHBOARD STATS ---
async function loadDashboardStats() {
    const { data, error } = await supabase.from('pets').select('status');
    if (error) return console.error("Error fetching stats:", error);

    const total = data.length;
    const sold = data.filter(pet => pet.status === 'Sold').length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-sold').innerText = sold;
}

// --- 5. ADD PET & UPLOAD MEDIA ---
async function addPet(event) {
    event.preventDefault(); // Stop form from refreshing the page
    const btn = document.getElementById('submit-btn');
    const statusText = document.getElementById('upload-status');
    btn.innerText = "Uploading...";
    btn.disabled = true;

    // 1. Get Form Data
    const name = document.getElementById('pet-name').value;
    const price = document.getElementById('pet-price').value;
    const category = document.getElementById('pet-category').value;
    const status = document.getElementById('pet-status').value;
    const desc = document.getElementById('pet-desc').value;
    const file = document.getElementById('pet-media').files[0];

    // 2. Upload File to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from('pet-media').upload(filePath, file);
    
    if (uploadError) {
        statusText.innerText = "Error uploading file: " + uploadError.message;
        btn.innerText = "Upload Pet";
        btn.disabled = false;
        return;
    }

    // 3. Get Public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage.from('pet-media').getPublicUrl(filePath);
    const mediaUrl = publicUrlData.publicUrl;

    // 4. Save data to Supabase Database
    const { error: dbError } = await supabase.from('pets').insert([{
        name: name,
        price: price,
        category: category,
        status: status,
        description: desc,
        media_url: mediaUrl
    }]);

    if (dbError) {
        statusText.innerText = "Error saving pet: " + dbError.message;
    } else {
        statusText.innerText = "Pet added successfully!";
        statusText.style.color = "green";
        document.getElementById('add-pet-form').reset();
    }

    btn.innerText = "Upload Pet";
    btn.disabled = false;
}

// --- 6. LIST & MANAGE PETS ---
async function loadPets() {
    const { data, error } = await supabase.from('pets').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);

    const tbody = document.getElementById('pets-table-body');
    tbody.innerHTML = ''; // Clear table

    data.forEach(pet => {
        const isSold = pet.status === 'Sold';
        tbody.innerHTML += `
            <tr>
                <td><img src="${pet.media_url}" class="thumbnail"></td>
                <td>${pet.name}</td>
                <td>$${pet.price}</td>
                <td>${pet.category}</td>
                <td><strong>${pet.status}</strong></td>
                <td>
                    ${!isSold ? `<button class="btn-sold" onclick="markSold('${pet.id}')">Mark Sold</button>` : ''}
                    <button class="btn-delete" onclick="deletePet('${pet.id}', '${pet.media_url}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

// --- 7. UPDATE STATUS ---
async function markSold(id) {
    await supabase.from('pets').update({ status: 'Sold' }).eq('id', id);
    loadPets(); // Reload table
    loadDashboardStats();
}

// --- 8. DELETE PET & MEDIA ---
async function deletePet(id, mediaUrl) {
    if(!confirm("Are you sure you want to delete this pet?")) return;

    // 1. Delete from Database
    await supabase.from('pets').delete().eq('id', id);

    // 2. Extract filename from URL and delete from Storage
    // The URL looks like: .../storage/v1/object/public/pet-media/filename.jpg
    const fileName = mediaUrl.split('/').pop(); 
    await supabase.storage.from('pet-media').remove([fileName]);

    loadPets(); // Reload table
    loadDashboardStats();
}
