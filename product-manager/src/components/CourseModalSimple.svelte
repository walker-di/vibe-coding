<script lang="ts">
    import { courseTemplates, getCoursesByCategory, type CourseTemplate } from '../data/courseTemplates';
    import { dispatchGameAction } from '../store/gameStore';
    import { companyFinances } from '../store/gameStore';
    import { showSuccessNotification, showErrorNotification } from '../store/uiStore';

    interface Props {
        visible: boolean;
        onClose?: () => void;
    }

    let { visible = $bindable(false), onClose = () => {} }: Props = $props();

    let selectedCourse = $state<CourseTemplate | null>(null);

    function closeModal() {
        visible = false;
        selectedCourse = null;
        onClose();
    }

    function selectCourse(course: CourseTemplate) {
        selectedCourse = course;
    }

    function handleCreateCourse() {
        if (!selectedCourse) return;

        // Check if company has enough capital
        if ($companyFinances.capital < selectedCourse.cost) {
            showErrorNotification(`Not enough capital to create course. Need $${selectedCourse.cost.toLocaleString()}, have $${$companyFinances.capital.toLocaleString()}`);
            return;
        }

        // Create course node
        const courseData = {
            id: `course-${selectedCourse.id}-${Date.now()}`,
            label: selectedCourse.label,
            type: 'Course',
            description: selectedCourse.description,
            courseTemplateId: selectedCourse.id,
            skillsImproved: [...selectedCourse.skillsImproved],
            efficiencyBoost: selectedCourse.efficiencyBoost,
            duration: selectedCourse.duration,
            cost: selectedCourse.cost,
            category: selectedCourse.category,
            maxParticipants: selectedCourse.maxParticipants,
            enrolledPersonnelIds: [],
            personnelProgress: {},
            isActive: false,
            isCompleted: false,
            position: {
                x: Math.random() * 400 + 100,
                y: Math.random() * 400 + 100
            }
        };

        const result = dispatchGameAction({
            type: 'ADD_NODE',
            payload: courseData
        });

        if (result.success) {
            // Deduct the cost
            dispatchGameAction({
                type: 'UPDATE_FINANCES',
                payload: { capitalChange: -selectedCourse.cost }
            });

            showSuccessNotification(`Created ${selectedCourse.label} course for $${selectedCourse.cost.toLocaleString()}!`);
            closeModal();
        } else {
            showErrorNotification(`Failed to create course: ${result.message}`);
        }
    }

    // Format currency
    function formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // Format duration in seconds to readable format
    function formatDuration(seconds: number): string {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
    }
</script>

{#if visible}
    <!-- Modal backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <!-- Modal content -->
        <div class="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 class="text-xl font-semibold text-white">Create Training Course</h2>
                <button
                    class="text-gray-400 hover:text-white transition-colors"
                    onclick={closeModal}
                >
                    ✕
                </button>
            </div>

            <!-- Course list -->
            <div class="p-6 max-h-96 overflow-y-auto">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each courseTemplates as course}
                        <button
                            class="text-left p-4 rounded-lg border transition-colors {selectedCourse === course 
                                ? 'bg-blue-600 border-blue-500 text-white' 
                                : 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300'}"
                            onclick={() => selectCourse(course)}
                        >
                            <div class="font-medium mb-2">{course.label}</div>
                            <div class="text-sm opacity-75 mb-2">{course.description}</div>
                            <div class="flex justify-between items-center text-xs">
                                <span>{formatCurrency(course.cost)}</span>
                                <span>{formatDuration(course.duration)}</span>
                                <span>+{(course.efficiencyBoost * 100).toFixed(0)}% efficiency</span>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between p-6 border-t border-gray-700">
                <div class="text-sm text-gray-400">
                    Company Capital: {formatCurrency($companyFinances.capital)}
                </div>
                <div class="flex space-x-3">
                    <button
                        class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        onclick={closeModal}
                    >
                        Cancel
                    </button>
                    <button
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onclick={handleCreateCourse}
                        disabled={!selectedCourse || $companyFinances.capital < (selectedCourse ? selectedCourse.cost : 0)}
                    >
                        Create Course {selectedCourse ? formatCurrency(selectedCourse.cost) : ''}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
