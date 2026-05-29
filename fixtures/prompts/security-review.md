Please review the following Python code for security vulnerabilities,
code quality, and adherence to best practices:

```python
import sqlite3
import os

def get_user(username):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    result = cursor.fetchone()
    conn.close()
    return result

def save_file(filename, content):
    path = os.path.join('/uploads', filename)
    with open(path, 'w') as f:
        f.write(content)
    return path

def hash_password(password):
    import hashlib
    return hashlib.md5(password.encode()).hexdigest()
```

Provide a detailed review covering:
1. SQL injection risks
2. Path traversal vulnerabilities  
3. Weak hashing algorithms
4. Resource management issues
5. An improved version of each function
