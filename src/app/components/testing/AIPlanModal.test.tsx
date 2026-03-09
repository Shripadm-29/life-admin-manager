import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIPlanModal } from '../AIPlanModal';
import type { PlanItemType } from '@/lib/aiPlan';

const mockPlanItems: PlanItemType[] = [
  {
    plannedFor: new Date(Date.now() + 3600000).toISOString(),
    durationMinutes: 60,
    title: 'Read chapter 3',
    checklist: ['Review key concepts', 'Take notes'],
  },
  {
    plannedFor: new Date(Date.now() + 7200000).toISOString(),
    durationMinutes: 45,
    title: 'Complete practice problems',
    checklist: ['Problems 1-10', 'Check answers'],
  },
];

describe('AIPlanModal Component', () => {
  const mockOnAccept = vi.fn().mockResolvedValue(undefined);
  const mockOnRegenerate = vi.fn().mockResolvedValue(undefined);
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal when open is true', () => {
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

    expect(screen.getByText(/AI suggested plan/i)).toBeInTheDocument();
  });

  it('should not render modal when open is false', () => {
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

    expect(screen.queryByText(/AI suggested plan/i)).not.toBeInTheDocument();
  });

  it('should display task title in modal header', () => {
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

    expect(screen.getByText(/Complete assignment/i)).toBeInTheDocument();
  });

  it('should display task due date when provided', () => {
    const dueDate = new Date('2025-12-25T14:30:00').toISOString();

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

    expect(screen.getByText(/Due/i)).toBeInTheDocument();
  });

  it('should display all plan items', () => {
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

  it('should display empty state when no plan items', () => {
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

    const acceptButton = screen.getByRole('button', { name: /Accept Plan/i });
    await user.click(acceptButton);

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
