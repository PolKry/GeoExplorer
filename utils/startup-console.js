function showStartupBanner() {
    console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║                  GeoExplorer                     ║
║                 Server Startup                   ║
║                                                  ║
╚══════════════════════════════════════════════════╝
`);
}

function showStartupSection(title) {
    console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`);
}

function showServerAddress(port) {
    console.log(`  http://localhost:${port}\n`);
}

function showStartupError(error) {
    console.error(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║          Failed to start GeoExplorer             ║
║                                                  ║
╚══════════════════════════════════════════════════╝

  ${error.message}
`);
}

module.exports = {
    showStartupBanner,
    showStartupSection,
    showServerAddress,
    showStartupError,
};