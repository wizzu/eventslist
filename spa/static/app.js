// The main Alpine.js component. Alpine looks for this when it sees x-data="app".
document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    status: 'Alpine is working.',
  }));
});
