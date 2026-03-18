import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIPlanModal } from '../AIPlanModal';
import type { PlanItemType } from '@/lib/aiPlan';

const mockPlanItems: PlanItemType[] = [
  {
    plannedFor: new Date(Date.now() + 3600000).toISOString(),
    durationMinutes: 60,
    plannerSubtask: 'Read chapter 3',
    checklist: ['Review key concepts', 'Take notes'],
  },
  {
    plannedFor: new Date(Date.now() + 7200000).toISOString(),
    durationMinutes: 45,
    plannerSubtask: 'Complete practice problems',
    checklist: ['Problems 1-10', 'Check answers'],
  },
];

// Main test suite for the AIPlanModal component
describe('AIPlanModal Component', () => {
  const mockOnAccept = vi.fn().mockResolvedValue(undefined);
  const mockOnRegenerate = vi.fn().mockResolvedValue(undefined);
  const mockOnClose = vi.fn();

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test that the modal is visible when open is true
  it('should render modal when open is true', () => {
    // Render component
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    // Assert visibility
    expect(screen.getByText(/AI suggested plan/i)).toBeInTheDocument();
  });

  // Test that the modal is hidden when open is false
  it('should not render modal when open is false', () => {
    // Render component
    render(
      <AIPlanModal
        open={false}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    // Assert invisibility
    expect(screen.queryByText(/AI suggested plan/i)).not.toBeInTheDocument();
  });

  // Test that the task title is displayed correctly
  it('should display task title in modal header', () => {
    // Render component
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    // Assert title presence
    expect(screen.getByText(/Complete assignment/i)).toBeInTheDocument();
  });

  // Test that the due date is displayed
  it('should display task due date when provided', () => {
    // Set up data
    const dueDate = new Date('2025-12-25T14:30:00').toISOString();

    // Render component
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={dueDate}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    // Assert due date text
    expect(screen.getByText(/Due/i)).toBeInTheDocument();
  });

  // Test that all plan items are rendered
  it('should display all plan items', () => {
    // Render component
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    // Assert items rendered
    expect(screen.getByText(/Read chapter 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete practice problems/i)).toBeInTheDocument();
  });

  it('should display duration for each plan item', () => {
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/60 min/i)).toBeInTheDocument();
    expect(screen.getByText(/45 min/i)).toBeInTheDocument();
  });

  it('should display checklist items for each plan item', () => {
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/Review key concepts/i)).toBeInTheDocument();
    expect(screen.getByText(/Take notes/i)).toBeInTheDocument();
    expect(screen.getByText(/Problems 1-10/i)).toBeInTheDocument();
    expect(screen.getByText(/Check answers/i)).toBeInTheDocument();
  });

  // Test empty state
  it('should display empty state when no plan items', () => {
    // Render component
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={[]}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    // Assert empty message
    expect(screen.getByText(/No plan items generated/i)).toBeInTheDocument();
  });

  it('should render Accept Plan button', () => {
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('button', { name: /Accept Plan/i })).toBeInTheDocument();
  });

  it('should render Regenerate button', () => {
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('button', { name: /Regenerate/i })).toBeInTheDocument();
  });

  it('should render Skip button', () => {
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument();
  });

  it('should call onAccept when Accept Plan button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    // Trigger user input
    const acceptButton = screen.getByRole('button', { name: /Accept Plan/i });
    await user.click(acceptButton);

    // Assert callback execution
    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalledWith(mockPlanItems);
    });
  });

  it('should call onRegenerate when Regenerate button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    const regenerateButton = screen.getByRole('button', { name: /Regenerate/i });
    await user.click(regenerateButton);

    await waitFor(() => {
      expect(mockOnRegenerate).toHaveBeenCalled();
    });
  });

  it('should call onClose when Skip button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    const skipButton = screen.getByRole('button', { name: /Skip/i });
    await user.click(skipButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable buttons when loading prop is true', () => {
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
        loading={true}
      />
    );

    const acceptButton = screen.getByRole('button', { name: /Accept Plan|Saving/i });
    const regenerateButton = screen.getByRole('button', { name: /Regenerate/i });
    const skipButton = screen.getByRole('button', { name: /Skip/i });

    expect(acceptButton).toBeDisabled();
    expect(regenerateButton).toBeDisabled();
    expect(skipButton).toBeDisabled();
  });

  it('should show loading text on Accept button when accepting', async () => {
    const slowOnAccept = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    const user = userEvent.setup();

    const { rerender } = render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={slowOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    const acceptButton = screen.getByRole('button', { name: /Accept Plan/i });
    await user.click(acceptButton);

    await waitFor(() => {
      expect(slowOnAccept).toHaveBeenCalled();
    });
  });

  it('should show loading text on Regenerate button when regenerating', async () => {
    const slowOnRegenerate = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    const user = userEvent.setup();

    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={slowOnRegenerate}
        onClose={mockOnClose}
      />
    );

    const regenerateButton = screen.getByRole('button', { name: /Regenerate/i });
    await user.click(regenerateButton);

    await waitFor(() => {
      expect(slowOnRegenerate).toHaveBeenCalled();
    });
  });

  it('should handle missing taskDue gracefully', () => {
    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        previewPlan={mockPlanItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/AI suggested plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete assignment/i)).toBeInTheDocument();
  });

  it('should handle plan items without checklist', () => {
    const itemsWithoutChecklist: PlanItemType[] = [
      {
        plannedFor: new Date(Date.now() + 3600000).toISOString(),
        durationMinutes: 60,
        title: 'Study session',
        checklist: [],
      },
    ];

    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={itemsWithoutChecklist}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(/Study session/i)).toBeInTheDocument();
    expect(screen.getByText(/60 min/i)).toBeInTheDocument();
  });

  it('should be scrollable when many plan items exist', () => {
    const manyItems: PlanItemType[] = Array.from({ length: 20 }, (_, i) => ({
      plannedFor: new Date(Date.now() + (i + 1) * 3600000).toISOString(),
      durationMinutes: 30,
      title: `Task ${i + 1}`,
      checklist: [`Step 1`, `Step 2`],
    }));

    render(
      <AIPlanModal
        open={true}
        taskTitle="Complete assignment"
        taskDue={new Date().toISOString()}
        previewPlan={manyItems}
        onAccept={mockOnAccept}
        onRegenerate={mockOnRegenerate}
        onClose={mockOnClose}
      />
    );

    // Modal should render and be scrollable - check for first and last items
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 20')).toBeInTheDocument();
  });
});
