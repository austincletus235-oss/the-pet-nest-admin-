// --- 1. INITIALIZE SUPABASE ---
const supabaseUrl = 'https://mbpdimmuuzrxgsraofew.supabase.co';
const supabaseKey = 'sb_publishable_KIu8B6ZxNI0y03L2MXszQQ_bfHS-n-k';

// MOBILE DEBUG: Alert if the Supabase library didn't load from the HTML file
if (!window.supabase) {
    alert("CRITICAL ERROR: Supabase library is missing. Check your index.html file!");
}

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. AUTHENTICATION LOGIC ---
async function login() {
    const emailInput = document.getElementById('email').value;
    const passwordInput = document.getElementById('password').value;
    const errorText = document.getElementById('login-error');

    // Visual feedback so you know the button works on your phone
    errorText.innerText = "Attempting to log in...";
    errorText.style.color = "blue";

    if (!emailInput || !passwordInput) {
        errorText.innerText = "Please enter both your email and password.";
        errorText.style.color = "red";
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ 
            email: emailInput, 
            password: passwordInput 
        });
        
        if (error) {
            // Shows exact Supabase error on screen
            errorText.innerText = "Login Failed: " + error.message;
            errorText.style.color = "red";
        } else {
            errorText.innerText = "Success! Loading dashboard...";
            errorText.style.color = "green";
            
            document.getElementById('login-section').classList.remove('active');
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('dashboard-section').classList.remove('hidden');
            
            loadDashboardStats();
            loadPets();
        }
    } catch (err) {
        // Triggers a phone pop-up if the code completely crashes
        alert("Code crashed during login: " + err.message);
        errorText.innerText = "Crash: " + err.message;
        errorText.style.color = "red";
    }
}

async function logout() {
    await supabase.auth.signOut();
    window.location.reload(); 
}

// Check if already logged in when you refresh the page
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('login-section').classList.remove('active');
        document.getElementById('dashboard-section').classList.remove('hidden');
        loadDashboardStats();
        loadPets();
    }
}).catch(err => {
    console.error("Session check failed", err);
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
    if (error) {
        alert("Error loading stats: " + error.message);
        return;
    }

    const total = data.length;
    const sold = data.filter(pet => pet.status === 'Sold').length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-sold').innerText = sold;
}

// --- 5. ADD PET & UPLOAD MEDIA ---
async function addPet(event) {
    event.preventDefault(); 
    const btn = document.getElementById('submit-btn');
    const statusText = document.getElementById('upload-status');
    btn.innerText = "Uploading...";
    btn.disabled = true;

    try {
        const name = document.getElementById('pet-name').value;
        const price = document.getElementById('pet-price').value;
        const category = document.getElementById('pet-category').value;
        const status = document.getElementById('pet-status').value;
        const desc = document.getElementById('pet-desc').value;
        const fileInput = document.getElementById('pet-media');

        if (fileInput.files.length === 0) {
            statusText.innerText = "Please select an image/video first.";
            statusText.style.color = "red";
            btn.innerText = "Upload Pet";
            btn.disabled = false;
            return;
        }

        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload file
        const { error: uploadError } = await supabase.storage.from('pet-media').upload(fileName, file);
        
        if (uploadError) {
            statusText.innerText = "Storage Error: " + uploadError.message;
            statusText.style.color = "red";
            btn.innerText = "Upload Pet";
            btn.disabled = false;
            return;
        }

        // Get URL
        const { data: publicUrlData } = supabase.storage.from('pet-media').getPublicUrl(fileName);
        const mediaUrl = publicUrlData.publicUrl;

        // Save to Database
        const { error: dbError } = await supabase.from('pets').insert([{
            name: name,
            price: price,
            category: category,
            status: status,
            description: desc,
            media_url: mediaUrl
        }]);

        if (dbError) {
            statusText.innerText = "Database Error: " + dbError.message;
            statusText.style.color = "red";
        } else {
            statusText.innerText = "Pet added successfully! 🎉";
            statusText.style.color = "green";
            document.getElementById('add-pet-form').reset();
        }

    } catch (err) {
        alert("Upload crashed: " + err.message);
        statusText.innerText = "Crash: " + err.message;
        statusText.style.color = "red";
    }

    btn.innerText = "Upload Pet";
    btn.disabled = false;
}

// --- 6. LIST & MANAGE PETS ---
async function loadPets() {
    const { data, error } = await supabase.from('pets').select('*').order('created_at', { ascending: false });
    if (error) {
        alert("Error loading pets: " + error.message);
        return;
    }

    const tbody = document.getElementById('pets-table-body');
    tbody.innerHTML = ''; 

    data.forEach(pet => {
        const isSold = pet.status === 'Sold';
        tbody.innerHTML += `
            <tr>
                <td><img src="${pet.media_url}" class="thumbnail" style="width:60px; height:60px; object-fit:cover; border-radius:4px;"></td>
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
    const { error } = await supabase.from('pets').update({ status: 'Sold' }).eq('id', id);
    if (error) alert("Error marking as sold: " + error.message);
    loadPets(); 
    loadDashboardStats();
}

// --- 8. DELETE PET & MEDIA ---
async function deletePet(id, mediaUrl) {
    if(!confirm("Are you sure you want to delete this pet?")) return;

    // Delete DB record
    const { error: dbError } = await supabase.from('pets').delete().eq('id', id);
    if (dbError) {
        alert("Database delete error: " + dbError.message);
        return;
    }

    // Delete Storage file
    const fileName = mediaUrl.split('/').pop(); 
    const { error: storageError } = await supabase.storage.from('pet-media').remove([fileName]);
    if (storageError) alert("Storage delete error: " + storageError.message);

    loadPets(); 
    loadDashboardStats();
}
