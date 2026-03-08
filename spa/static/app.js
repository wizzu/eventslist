// The main Alpine.js component. Alpine looks for this when it sees x-data="app".
document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    status: 'Loading...',

    // Called automatically by Alpine when the component initializes.
    async init() {
      const response = await fetch('events.txt');
      const text = await response.text();
      this.status = `Loaded ${text.length} characters.`;
    },
  }));
});
