// app.js - Fixed version
const supabaseUrl = 'https://mbpdimmuuzrxgsraofew.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icGRpbW11dXpyeGdzcmFvZmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDYwNjAsImV4cCI6MjA5MTk4MjA2MH0.g54oYMrrChSGr_fRpMwFIYp5LAQcV1hzIJqvRXpjj6E';

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorText = document.getElementById('login-error');

    errorText.innerText = "Logging in...";
    errorText.style.color = "blue";

    if (!email || !password) {
        errorText.innerText = "Please enter email and password";
        errorText.style.color = "red";
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            errorText.innerText = "Login failed: " + error.message;
            errorText.style.color = "red";
        } else {
            errorText.innerText = "Login successful!";
            errorText.style.color = "green";

            // Hide login and show dashboard
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('dashboard-section').classList.remove('hidden');

            loadDashboardStats();
            loadPets();
        }
    } catch (err) {
        errorText.innerText = "Error: " + err.message;
        errorText.style.color = "red";
        alert("Login error: " + err.message);
    }
}

// Make the function available to the HTML button
window.login = login;
