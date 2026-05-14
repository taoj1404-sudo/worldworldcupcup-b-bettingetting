async function main() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@worldcup.bet',
      password: 'Admin@2026!'
    })
  })
  const data = await res.json()
  console.log('Status:', res.status)
  console.log('Response:', JSON.stringify(data))
}

main()
