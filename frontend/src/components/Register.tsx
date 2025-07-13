import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

interface RegisterProps {
    onAuthSuccess: () => void; // Expect the function as a prop
}

const Register: React.FC<RegisterProps> = ({ onAuthSuccess }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // NEW: State for validation errors
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    
    // NEW: State for the final message from the server
    const [serverMessage, setServerMessage] = useState('');

    // --- NEW: Validation Logic ---
    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        // Email validation
        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email address is invalid';
        }

        // Password validation
        if (!password) {
            newErrors.password = 'Password is required';
        } else {
            if (password.length < 8) newErrors.password = 'Password must be at least 8 characters. ';
            if (!/[A-Z]/.test(password)) newErrors.password = (newErrors.password || '') + 'Must contain an uppercase letter. ';
            if (!/[a-z]/.test(password)) newErrors.password = (newErrors.password || '') + 'Must contain a lowercase letter. ';
            if (!/[0-9]/.test(password)) newErrors.password = (newErrors.password || '') + 'Must contain a number.';
        }
        
        setErrors(newErrors);
        
        // Return true if there are no errors
        return Object.keys(newErrors).length === 0;
    };

    const navigate = useNavigate(); // Initialize the navigate function

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerMessage(''); // Clear previous server messages
        
        // Run validation before submitting
        if (validate()) {
            try {
                const response = await api.post('/register', {
                    username,
                    email,
                    password
                });
                setServerMessage(response.data.message);
                // Optionally clear form on success
                setUsername('');
                setEmail('');
                setPassword('');
                setErrors({});

                const token = response.data.token;
                if (token) {
                    localStorage.setItem('token', token); // 1. Save the token
                    onAuthSuccess();                      // 2. Tell App.tsx we are logged in
                    navigate('/dashboard');               // 3. Redirect to the dashboard
                }
            } catch (error: any) {
                if (error.response && error.response.data) {
                    setServerMessage(error.response.data.error);
                } else {
                    setServerMessage('Registration failed. Please try again.');
                }
            }
        }
    };

    return (
        <div>
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Username</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required 
                    />
                </div>
                <div>
                    <label>Email</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                    />
                    {/* Display email validation error */}
                    {errors.email && <p style={{ color: 'red' }}>{errors.email}</p>}
                </div>
                <div>
                    <label>Password</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                    {/* Display password validation error */}
                    {errors.password && <p style={{ color: 'red' }}>{errors.password}</p>}
                </div>
                <button type="submit">Register</button>
            </form>
            {/* Display the final message from the server */}
            {serverMessage && <p>{serverMessage}</p>}
            <p>
                Have an account already? <Link to="/login">Login now</Link>
            </p>
        </div>
    );
};

export default Register;