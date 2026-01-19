import requests
import sys

BASE_URL = "http://localhost:5174"

def test_register(username, password, description=""):
    print(f"--- Testing Register: {description} ---")
    url = f"{BASE_URL}/auth/register?/default"
    # SvelteKit form actions use multipart or urlencoded. 
    # The action response is usually a JSON-like structure if we requested it as such, but standard form post returns redirects or HTML.
    # To properly simulate form submission in SvelteKit via API, we post data.
    
    data = {
        "username": username,
        "password": password,
        "password_confirm": password,
        "cf-turnstile-response": "dev-token" # assuming dev mode bypasses or we fail
    }
    
    # We might need headers to mimic SvelteKit form submission if it checks 'x-sveltekit-action'
    headers = {
        "Origin": BASE_URL,
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        # We generally expect a redirect (302) on success, or 400/500 on failure handled by validation.
        r = requests.post(url, data=data, headers=headers, allow_redirects=False)
        print(f"Status Code: {r.status_code}")
        
        if r.status_code == 302 or r.status_code == 303:
            print("params: Success (Redirected)")
            return True
        elif r.status_code == 200:
             # Sveltekit action failure often returns 200 with a validation error in the body
             print("Result: Likely Validation Error (200 OK)")
             # simplistic check
             if "Invalid username" in r.text or "Invalid password" in r.text:
                 print("Validation Message Found")
             return False
        else:
            print(f"Result: Error {r.status_code}")
            return False
            
    except Exception as e:
        print(f"Exception: {e}")
        return False

def test_login(username, password, description=""):
    print(f"--- Testing Login: {description} ---")
    url = f"{BASE_URL}/auth/login?/default"
    data = {
        "username": username,
        "password": password,
        "cf-turnstile-response": "dev-token"
    }
    headers = {
        "Origin": BASE_URL,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    try:
        r = requests.post(url, data=data, headers=headers, allow_redirects=False)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 302:
            print("Result: Login Success (Redirected)")
            return True
        else:
            print("Result: Login Failed")
            return False
    except Exception as e:
        print(f"Exception: {e}")
        return False

if __name__ == "__main__":
    print("STARTING DESTRUCTIVE QA")
    
    # 1. Normal
    test_register("qa_normal", "password123", "Normal User")
    
    # 2. SQLi
    test_register("' OR 1=1 --", "password123", "SQL Injection Username")
    
    # 3. XSS
    test_register("<script>alert(1)</script>", "password123", "XSS Username")
    
    # 4. Long String
    long_str = "a" * 5000
    test_register("longuser", long_str, "Buffer Overhead Password")
    
    print("DONE")
