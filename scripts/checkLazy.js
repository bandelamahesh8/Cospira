// quick helper to verify that each lazily imported page actually exports a non-undefined default
// run with `node scripts/checkLazy.js` (make sure tsx files can be imported by Node, or adjust using ts-node)

// Paths are relative to the project root (one level up from the scripts folder)
const paths = [
  '../src/pages/Auth.tsx',
  '../src/pages/AboutPage.tsx',
  '../src/pages/CreateRoom.tsx',
  '../src/pages/Docs.tsx',
  '../src/pages/Room.tsx',
  '../src/pages/Profile.tsx',
  '../src/pages/Feedback.tsx',
  '../src/pages/NotFound.tsx',
  '../src/pages/random-connect/RandomLanding.tsx',
  '../src/pages/random-connect/TextRoom.tsx',
  '../src/pages/Projects.tsx',
  '../src/pages/Organizations.tsx',
  '../src/pages/OrganizationRoom.tsx',
  '../src/pages/BreakoutRoom.tsx',
  '../src/pages/Join.tsx',
];

(async () => {
  for (const p of paths) {
    try {
      const mod = await import(p);
      console.log(p, 'default export present?', mod.default !== undefined, 'type', typeof mod.default);
    } catch (err) {
      console.error(p, 'import failed:', err.message || err);
    }
  }
})();
