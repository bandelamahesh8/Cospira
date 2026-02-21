// Test file to verify theme exports
import { theme } from './src/core/theme';

console.log('Theme object:', theme);
console.log('Spacing:', theme.spacing);
console.log('Spacing.md:', theme.spacing?.md);
console.log('Colors:', theme.colors);
console.log('Typography:', theme.typography);

export default theme;
