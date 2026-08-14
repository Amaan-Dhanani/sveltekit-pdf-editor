<script lang="ts">
    import { onMount } from 'svelte';
    import { X, Upload, File as FileIcon } from '@lucide/svelte';

    interface SavedDocument {
        id: string;
        name: string;
        date: string;
        pdfBlob: string;
        allObjects: any[];
    }

    interface DocumentSelectedEvent {
        pdfBlob: Blob;
        name: string;
        allObjects: any[];
    }

    interface Props {
        isOpen?: boolean;
        onclose?: () => void;
        ondocumentSelected?: (detail: DocumentSelectedEvent) => void;
    }

    let { 
        isOpen = $bindable(false),
        onclose,
        ondocumentSelected
    }: Props = $props();

    let savedDocuments: SavedDocument[] = $state([]);
    let selectedFile: File | null = $state(null); 
    let documentName = $state('');
    let error = $state('');

    onMount(() => {
        loadSavedDocuments();
    });

    function loadSavedDocuments() {
        const savedDocsString = localStorage.getItem('savedDocuments');
        if (savedDocsString) {
            savedDocuments = JSON.parse(savedDocsString);
        }
    }

    function closeModal() {
        isOpen = false;
        selectedFile = null;
        documentName = '';
        error = '';
        onclose?.();
    }

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        const files = target.files;
        if (files && files[0]) {
            selectedFile = files[0];

            const fileName = files[0].name;
            documentName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        }
    }

    async function handleSubmit() {
        if (!selectedFile) {
            error = 'Please select a PDF file';
            return;
        }

        if (!documentName.trim()) {
            error = 'Please enter a document name';
            return;
        }

        try {
            const pdfBlob = selectedFile;

            const newDoc: SavedDocument = {
                id: Date.now().toString(),
                name: documentName,
                date: new Date().toISOString(),
                pdfBlob: await blobToBase64(pdfBlob),
                allObjects: []
            };

            savedDocuments = [newDoc, ...savedDocuments];
            localStorage.setItem('savedDocuments', JSON.stringify(savedDocuments));

            ondocumentSelected?.({
                pdfBlob,
                name: documentName,
                allObjects: []
            });

            closeModal();
        } catch (err) {
            error = 'Failed to process the PDF file';
            console.error(err);
        }
    }

    function loadDocument(doc: SavedDocument) {
        try {
            const pdfBlob = base64ToBlob(doc.pdfBlob, 'application/pdf');

            ondocumentSelected?.({
                pdfBlob,
                name: doc.name,
                allObjects: doc.allObjects || []
            });

            closeModal();
        } catch (err) {
            error = 'Failed to load the saved document';
            console.error(err);
        }
    }

    function deleteDocument(id: string, event: Event) {
        event.stopPropagation();

        savedDocuments = savedDocuments.filter((doc) => doc.id !== id);
        localStorage.setItem('savedDocuments', JSON.stringify(savedDocuments));
    }

    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function base64ToBlob(base64: string, type: string): Blob {
        const byteString = atob(base64.split(',')[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const int8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
            int8Array[i] = byteString.charCodeAt(i);
        }

        return new Blob([int8Array], { type });
    }

    function formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center p-4 border-b">
                <h2 class="text-xl font-semibold">PDF Documents</h2>
                <button class="text-gray-500 hover:text-gray-700" onclick={closeModal}>
                    <X size={20} />
                </button>
            </div>

            <div class="p-4 border-b">
                <div class="mb-4">
                    <label for="pdf-file" class="block text-sm font-medium text-gray-700 mb-1"
                        >Upload PDF</label
                    >
                    <div class="flex items-center justify-center w-full">
                        <label
                            class="flex flex-col w-full h-32 border-2 border-dashed rounded-lg border-gray-300 hover:bg-gray-50 hover:border-orange-300 cursor-pointer"
                        >
                            <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload size={28} class="text-gray-400 mb-2" />
                                <p class="text-sm text-gray-500">
                                    <span class="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p class="text-xs text-gray-500">PDF files only</p>
                            </div>
                            <input
                                id="pdf-file"
                                type="file"
                                class="hidden"
                                accept="application/pdf"
                                onchange={handleFileChange}
                            />
                        </label>
                    </div>
                </div>

                {#if selectedFile}
                    <div class="mb-4">
                        <p class="text-sm text-gray-600">Selected: {selectedFile.name}</p>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1" for="documentName">
                            Document Name
                        </label>
                        <input
                            type="text"
                            id="documentName"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                            bind:value={documentName}
                            placeholder="Enter document name"
                        />
                    </div>

                    <button
                        class="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md transition-colors"
                        onclick={handleSubmit}
                    >
                        Upload and Open
                    </button>
                {/if}

                {#if error}
                    <p class="mt-2 text-sm text-red-600">{error}</p>
                {/if}
            </div>

            <div class="p-4">
                <h3 class="text-lg font-medium mb-3">Previous Documents</h3>

                {#if savedDocuments.length === 0}
                    <p class="text-gray-500 text-sm">No saved documents</p>
                {:else}
                    <div class="space-y-2">
                        {#each savedDocuments as doc (doc.id)}
                            <div
                                role="button"
                                tabindex="0"
                                class="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                                onclick={() => loadDocument(doc)}
                                onkeydown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        loadDocument(doc);
                                    }
                                }}
                            >
                                <div class="mr-3 text-gray-400">
                                    <FileIcon size={24} />
                                </div>
                                <div class="flex-1">
                                    <p class="font-medium text-gray-800">{doc.name}</p>
                                    <p class="text-xs text-gray-500">{formatDate(doc.date)}</p>
                                </div>
                                <button
                                    class="text-gray-400 hover:text-red-500"
                                    onclick={(e) => deleteDocument(doc.id, e)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}