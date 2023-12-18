const contentInput = document.getElementById('content')
const submitButton = document.getElementById('post')

let disabled = false

submitButton.addEventListener('click', async (event) => {
    if (disabled) return
    disabled = true

    // Construct request to create post
    let request = {
        content: contentInput.value
    }

    // Make request to create post
    let response = await fetch('/api/post', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(request)
    })

    // Reload if successful, otherwise re-enable
    if (response.ok) location.reload()
    else waiting = false
})