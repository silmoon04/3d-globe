# Contributing Guidelines

## Credit

This project started from [@bobbyroe's 3d-globe-with-threejs](https://github.com/bobbyroe/3d-globe-with-threejs) and has been significantly extended with NASA data integration and advanced features.

---

## Code Standards

### Documentation

All public functions require JSDoc:

```javascript
/**
 * Brief description
 * 
 * @param {Type} name - Description
 * @returns {Type} Description
 * 
 * @example
 * const result = functionName(arg);
 */
export function functionName(name) {
  // Implementation
}
```

### Style

- Functions < 30 lines
- Descriptive names (`createEarthMaterial` not `makeMat`)
- Add settings to `src/config.js`
- Extract reusable code to `src/utils/`

---

## Testing

Before submitting:

```bash
python -m http.server 8080
# Test at http://localhost:8080
```

Verify:
- No console errors
- All features work
- No breaking changes

---

## Commit Format

- `Add:` New feature
- `Fix:` Bug fix
- `Update:` Improve existing
- `Docs:` Documentation only

---

## Pull Requests

1. Keep changes focused
2. Include JSDoc
3. Update docs if needed
4. Test thoroughly

---

## Questions

Open an [Issue](https://github.com/silmoon04/3d-globe/issues) or [Discussion](https://github.com/silmoon04/3d-globe/discussions).
