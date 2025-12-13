import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

describe('App', () => {
  it('should render the app', () => {
    render(<App />);

    expect(screen.getByText(/vite \+ react/i)).toBeInTheDocument();
  });

  it('should render count button', () => {
    render(<App />);

    const button = screen.getByRole('button', { name: /count is/i });
    expect(button).toBeInTheDocument();
  });

  it('should increment count when button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole('button', { name: /count is 0/i });
    await user.click(button);

    expect(screen.getByRole('button', { name: /count is 1/i })).toBeInTheDocument();
  });
});
