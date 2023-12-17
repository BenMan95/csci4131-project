async function alertAccount() {
    alert('Register or login to interact with posts')
}

for (let button of document.getElementsByClassName('like')) {
    button.addEventListener('click', alertAccount)
}