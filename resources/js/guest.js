async function alertAccount() {
    // alert('Register or login to interact with posts')
    location.href = '/login'
}

for (let button of document.getElementsByClassName('button')) {
    button.addEventListener('click', alertAccount)
}