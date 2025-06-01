<script lang="ts">
    import { onMount } from 'svelte';
    import { dispatchGameAction } from '../store/gameStore';
    import { companyFinances } from '../store/gameStore';
    import { showSuccessNotification, showErrorNotification } from '../store/uiStore';

    interface Props {
        visible: boolean;
        onClose?: () => void;
    }

    let { visible = $bindable(false), onClose = () => {} }: Props = $props();

    interface FinanceOption {
        id: string;
        label: string;
        amount: number;
        description: string;
        icon: string;
        requirements?: string[];
        interestRate?: number;
        repaymentPeriod?: string;
    }

    const financeOptions: FinanceOption[] = [
        {
            id: 'angel-founder',
            label: 'Angel Founder',
            amount: 100000,
            description: 'Find an angel investor who requires a pitch presentation. Create a pitch task to convince them.',
            icon: '👼',
            requirements: ['pitch']
        },
        {
            id: 'bank-loan',
            label: 'Bank Loan',
            amount: 50000,
            description: 'Traditional bank loan with competitive interest rates.',
            icon: '🏦',
            requirements: [],
            interestRate: 5.5,
            repaymentPeriod: '5 years'
        },
        {
            id: 'federal-funds',
            label: 'Federal Funds',
            amount: 25000,
            description: 'Government funding program for small businesses and startups.',
            icon: '🏛️',
            requirements: []
        }
    ];

    let selectedOption = $state<FinanceOption | null>(null);
    let modalElement = $state<HTMLDivElement>();

    // Close modal when clicking outside
    onMount(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalElement && !modalElement.contains(event.target as Node)) {
                closeModal();
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                closeModal();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    });

    function closeModal() {
        visible = false;
        selectedOption = null;
        onClose();
    }

    function selectOption(option: FinanceOption) {
        selectedOption = option;
    }

    function handleSecureFunding() {
        if (!selectedOption) return;

        if (selectedOption.id === 'angel-founder') {
            // Create Angel Founder node instead of direct funding
            const angelFounderData = {
                id: `angel-founder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                label: 'Angel Investor',
                type: 'AngelFounder',
                description: 'An angel investor interested in funding your startup',
                fundingAmount: selectedOption.amount,
                requirements: ['pitch'],
                isAvailable: true,
                pitchId: undefined,
                fundingProvided: false,
                expertise: ['business development', 'networking', 'strategy'],
                networkValue: 0.8,
                position: {
                    x: Math.random() * 400 + 100,
                    y: Math.random() * 400 + 100
                }
            };

            const result = dispatchGameAction({
                type: 'ADD_NODE',
                payload: angelFounderData
            });

            if (result.success) {
                showSuccessNotification(`Found ${selectedOption.label}! Create a pitch to secure ${formatCurrency(selectedOption.amount)} funding.`);
                closeModal();
            } else {
                showErrorNotification(`Failed to find angel founder: ${result.message}`);
            }
        } else {
            // Direct funding for other options (Bank Loan, Federal Funds)
            const result = dispatchGameAction({
                type: 'UPDATE_FINANCES',
                payload: { capitalChange: selectedOption.amount }
            });

            if (result.success) {
                showSuccessNotification(`Secured ${selectedOption.label} funding of ${formatCurrency(selectedOption.amount)}!`);
                closeModal();
            } else {
                showErrorNotification(`Failed to secure funding: ${result.message}`);
            }
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
</script>

{#if visible}
    <!-- Modal backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <!-- Modal content -->
        <div bind:this={modalElement} class="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 class="text-xl font-semibold text-white">Finance Options</h2>
                <button
                    class="text-gray-400 hover:text-white transition-colors"
                    onclick={closeModal}
                >
                    ✕
                </button>
            </div>

            <!-- Finance options list -->
            <div class="p-6 max-h-96 overflow-y-auto">
                <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
                    {#each financeOptions as option}
                        <button
                            class="text-left p-6 rounded-lg border transition-colors {selectedOption === option 
                                ? 'bg-blue-600 border-blue-500 text-white' 
                                : 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300'}"
                            onclick={() => selectOption(option)}
                        >
                            <div class="flex items-start space-x-4">
                                <div class="text-3xl">{option.icon}</div>
                                <div class="flex-1">
                                    <div class="font-medium text-lg mb-2">{option.label}</div>
                                    <div class="text-sm opacity-75 mb-3">{option.description}</div>
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="font-semibold text-green-400">{formatCurrency(option.amount)}</span>
                                        {#if option.interestRate}
                                            <span class="text-yellow-400">{option.interestRate}% interest</span>
                                        {/if}
                                        {#if option.repaymentPeriod}
                                            <span class="text-gray-400">{option.repaymentPeriod}</span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between p-6 border-t border-gray-700">
                <div class="text-sm text-gray-400">
                    Current Capital: {formatCurrency($companyFinances.capital)}
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
                        onclick={handleSecureFunding}
                        disabled={!selectedOption}
                    >
                        Secure Funding {selectedOption ? formatCurrency(selectedOption.amount) : ''}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
