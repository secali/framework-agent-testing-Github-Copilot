## Code Review: Security Analysis

### 1. SQL Injection Vulnerability

The `get_user` function uses f-string formatting to build SQL queries, which is vulnerable to SQL injection attacks. Use parameterized queries instead:

```python
def get_user(username):
    conn = sqlite3.connect('users.db')
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        return cursor.fetchone()
    finally:
        conn.close()
```

### 2. Path Traversal

The `save_file` function doesn't validate the filename, allowing path traversal attacks with inputs like `../../etc/passwd`. Always sanitize:

```python
def save_file(filename, content):
    safe_name = os.path.basename(filename)
    path = os.path.join('/uploads', safe_name)
    with open(path, 'w') as f:
        f.write(content)
    return path
```

### 3. Weak Hashing

MD5 is cryptographically broken. Use bcrypt or argon2 for password hashing:

```python
import bcrypt

def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt())
```

**Quality Rating: 3/10** — Critical security issues found.
