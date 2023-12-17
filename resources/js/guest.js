async function alertAccount() {
    alert('Register or login to interact with posts')
}

for (let button of document.getElementsByClassName('button')) {
    button.addEventListener('click', alertAccount)
}