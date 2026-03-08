import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Reset testing library cleanup
afterEach(() => {
    cleanup();
});
