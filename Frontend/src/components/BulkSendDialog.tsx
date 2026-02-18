import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send, Loader2, CheckCircle, AlertCircle, ChevronRight, XCircle } from 'lucide-react';
import * as api from '../lib/api';

interface BulkSendDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

// Extract {{1}}, {{2}}, etc. variable placeholders from template components
function extractTemplateVariables(template: any): { index: number; component: string }[] {
    const vars: { index: number; component: string }[] = [];
    if (!template?.components) return vars;

    for (const comp of template.components) {
        const text = comp.text || '';
        const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
        for (const match of matches) {
            const idx = parseInt(match[1]);
            if (!vars.find(v => v.index === idx && v.component === comp.type)) {
                vars.push({ index: idx, component: comp.type });
            }
        }
    }
    return vars.sort((a, b) => a.index - b.index);
}

// Build template preview text
function buildTemplatePreview(template: any, variables: Record<string, string>): string {
    if (!template?.components) return '';
    const bodyComp = template.components.find((c: any) => c.type === 'BODY');
    if (!bodyComp?.text) return '';
    return bodyComp.text.replace(/\{\{(\d+)\}\}/g, (_: string, idx: string) => {
        return variables[idx] ? `[${variables[idx]}]` : `{{${idx}}}`;
    });
}

const BulkSendDialog: React.FC<BulkSendDialogProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [step, setStep] = useState<'select' | 'variables' | 'sending' | 'result' | 'error'>('select');
    const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedTemplateData, setSelectedTemplateData] = useState<any>(null);
    const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
    const [jobId, setJobId] = useState<number | null>(null);
    const [jobResult, setJobResult] = useState<any>(null);
    const [totalContacts, setTotalContacts] = useState(0);
    const [error, setError] = useState('');

    // Fetch segments
    const { data: segments = [] } = useQuery({
        queryKey: ['segments'],
        queryFn: api.getSegments,
        enabled: isOpen,
    });

    // Fetch templates
    const { data: templates = [], isLoading: templatesLoading } = useQuery({
        queryKey: ['templates'],
        queryFn: api.getTemplates,
        enabled: isOpen,
    });

    // When template changes, reset variables
    useEffect(() => {
        if (!selectedTemplate || !templates.length) {
            setSelectedTemplateData(null);
            setTemplateVariables({});
            return;
        }
        const tpl = templates.find((t: any) => t.name === selectedTemplate);
        setSelectedTemplateData(tpl || null);
        setTemplateVariables({});
    }, [selectedTemplate, templates]);

    // Poll job status after sending (wait 3s for background job to complete)
    useEffect(() => {
        if (step !== 'sending' || !jobId) return;
        const timer = setTimeout(async () => {
            try {
                const result = await api.getBulkStatus(jobId);
                setJobResult(result);
            } catch {
                // ignore polling error
            } finally {
                setStep('result');
                queryClient.invalidateQueries({ queryKey: ['bulk-history'] });
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [step, jobId]);

    const templateVars = selectedTemplateData ? extractTemplateVariables(selectedTemplateData) : [];
    const hasVariables = templateVars.length > 0;
    const allVariablesFilled = templateVars.every(v => templateVariables[String(v.index)]?.trim());

    // Send bulk mutation
    const sendMutation = useMutation({
        mutationFn: api.sendBulk,
        onSuccess: (data) => {
            setJobId(data.jobId);
            setTotalContacts(data.totalContacts);
            setStep('sending');
        },
        onError: (err: any) => {
            setError(err.response?.data?.error || 'Failed to start bulk send');
            setStep('error');
        },
    });

    const handleNext = () => {
        if (!selectedTemplate) { setError('Please select a template'); return; }
        if (!selectedSegment) { setError('Please select a segment'); return; }
        setError('');
        if (hasVariables) {
            setStep('variables');
        } else {
            doSend();
        }
    };

    const doSend = () => {
        const components: any[] = [];

        if (hasVariables) {
            const bodyVars = templateVars.filter(v => v.component === 'BODY');
            const headerVars = templateVars.filter(v => v.component === 'HEADER');

            if (headerVars.length > 0) {
                components.push({
                    type: 'header',
                    parameters: headerVars.map(v => ({
                        type: 'text',
                        text: templateVariables[String(v.index)] || ''
                    }))
                });
            }

            if (bodyVars.length > 0) {
                components.push({
                    type: 'body',
                    parameters: bodyVars.map(v => ({
                        type: 'text',
                        text: templateVariables[String(v.index)] || ''
                    }))
                });
            }

            // Fallback: if no component-specific vars, put all in body
            if (components.length === 0 && templateVars.length > 0) {
                components.push({
                    type: 'body',
                    parameters: templateVars.map(v => ({
                        type: 'text',
                        text: templateVariables[String(v.index)] || ''
                    }))
                });
            }
        }

        sendMutation.mutate({
            segmentId: selectedSegment!,
            templateName: selectedTemplate,
            languageCode: selectedTemplateData?.language || 'en_US',
            components,
        });
    };

    const handleClose = () => {
        setStep('select');
        setSelectedSegment(null);
        setSelectedTemplate('');
        setSelectedTemplateData(null);
        setTemplateVariables({});
        setJobId(null);
        setJobResult(null);
        setTotalContacts(0);
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    const selectedSegmentData = segments.find((s: any) => s.id === selectedSegment);
    const previewText = buildTemplatePreview(selectedTemplateData, templateVariables);

    // Compute result stats
    const sentCount = jobResult?.total_sent ?? 0;
    const failedCount = jobResult?.total_failed ?? 0;
    const allFailed = sentCount === 0 && failedCount > 0;
    const partialSuccess = sentCount > 0 && failedCount > 0;

    return (
        <div className="dialog-overlay">
            <div className="dialog-content max-w-2xl">
                <div className="dialog-header">
                    <h2 className="dialog-title">Bulk Send Template Message</h2>
                    <button onClick={handleClose} className="dialog-close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="dialog-body">

                    {/* Step 1: Select template & segment */}
                    {step === 'select' && (
                        <>
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Template Selection */}
                            <div className="mb-5">
                                <label className="label">Select Template *</label>
                                {templatesLoading ? (
                                    <div className="flex items-center gap-2 text-slate-500 py-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading templates from Meta...
                                    </div>
                                ) : templates.length === 0 ? (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                        <AlertCircle className="w-4 h-4 inline mr-2" />
                                        No approved templates found. Create and approve templates in Meta Business Manager first.
                                    </div>
                                ) : (
                                    <select
                                        value={selectedTemplate}
                                        onChange={(e) => { setSelectedTemplate(e.target.value); setError(''); }}
                                        className="input-field"
                                    >
                                        <option value="">-- Choose a template --</option>
                                        {templates.map((template: any) => (
                                            <option key={template.name} value={template.name}>
                                                {template.name} ({template.language})
                                                {template.components?.some((c: any) => c.text?.includes('{{')) ? ' ⚠️ has variables' : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {/* Template preview */}
                                {selectedTemplateData && (
                                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Template Preview</span>
                                            {hasVariables && (
                                                <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                                                    ⚠️ {templateVars.length} variable{templateVars.length > 1 ? 's' : ''} required
                                                </span>
                                            )}
                                        </div>
                                        {selectedTemplateData.components?.map((comp: any, i: number) => (
                                            <div key={i} className="text-sm text-slate-700 mb-1">
                                                {comp.type === 'HEADER' && <p className="font-bold">{comp.text || '[Header]'}</p>}
                                                {comp.type === 'BODY' && <p className="whitespace-pre-wrap">{comp.text}</p>}
                                                {comp.type === 'FOOTER' && <p className="text-xs text-slate-400 mt-1">{comp.text}</p>}
                                                {comp.type === 'BUTTONS' && (
                                                    <div className="flex gap-2 mt-2 flex-wrap">
                                                        {comp.buttons?.map((btn: any, bi: number) => (
                                                            <span key={bi} className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-full font-medium">
                                                                {btn.text}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Segment Selection */}
                            <div className="mb-5">
                                <label className="label">Select Segment *</label>
                                {segments.length === 0 ? (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                        <AlertCircle className="w-4 h-4 inline mr-2" />
                                        No segments found. Create a segment first in the Segments page.
                                    </div>
                                ) : (
                                    <select
                                        value={selectedSegment || ''}
                                        onChange={(e) => { setSelectedSegment(Number(e.target.value)); setError(''); }}
                                        className="input-field"
                                    >
                                        <option value="">-- Choose a segment --</option>
                                        {segments.map((segment: any) => (
                                            <option key={segment.id} value={segment.id}>
                                                {segment.name} ({segment.contact_count} contacts)
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Summary */}
                            {selectedTemplate && selectedSegment && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <h4 className="font-medium text-slate-700 mb-2">Summary</h4>
                                    <ul className="text-sm text-slate-600 space-y-1">
                                        <li><strong>Template:</strong> {selectedTemplate}</li>
                                        <li><strong>Segment:</strong> {selectedSegmentData?.name}</li>
                                        <li><strong>Recipients:</strong> {selectedSegmentData?.contact_count || 0} contacts</li>
                                        {hasVariables && (
                                            <li className="text-orange-700">
                                                <strong>⚠️ Next step:</strong> Fill in {templateVars.length} template variable{templateVars.length > 1 ? 's' : ''}
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}

                    {/* Step 2: Fill in template variables */}
                    {step === 'variables' && (
                        <>
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                <strong>Template "{selectedTemplate}"</strong> has {templateVars.length} variable{templateVars.length > 1 ? 's' : ''}.
                                Fill in the values below — the same values will be sent to all {selectedSegmentData?.contact_count || 0} contacts.
                            </div>

                            {/* Template body preview */}
                            {selectedTemplateData?.components?.find((c: any) => c.type === 'BODY') && (
                                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Template Body</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                        {selectedTemplateData.components.find((c: any) => c.type === 'BODY')?.text}
                                    </p>
                                </div>
                            )}

                            {/* Variable inputs */}
                            <div className="space-y-3 mb-4">
                                {templateVars.map((v) => (
                                    <div key={`${v.component}-${v.index}`}>
                                        <label className="label">
                                            Variable {`{{${v.index}}}`}
                                            <span className="ml-2 text-xs text-slate-400 font-normal">({v.component} section)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={templateVariables[String(v.index)] || ''}
                                            onChange={(e) => setTemplateVariables(prev => ({
                                                ...prev,
                                                [String(v.index)]: e.target.value
                                            }))}
                                            placeholder={`Enter value for {{${v.index}}}...`}
                                            className="input-field"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Live preview */}
                            {previewText && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Preview (with your values)</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{previewText}</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Step 3: Sending / waiting */}
                    {step === 'sending' && (
                        <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-700 mb-2">Sending Messages...</h3>
                            <p className="text-slate-500">Sending to {totalContacts} contacts. Please wait...</p>
                            <p className="text-xs text-slate-400 mt-2">This uses rate limiting (~12 msg/sec) to comply with Meta's limits</p>
                        </div>
                    )}

                    {/* Step 4: Result */}
                    {step === 'result' && (
                        <div className="text-center py-6">
                            {allFailed ? (
                                <>
                                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-slate-700 mb-2">Messages Failed to Deliver</h3>
                                    <p className="text-slate-500 mb-4">
                                        {sentCount} sent to Meta API, but {failedCount} failed to deliver.
                                    </p>
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 text-left">
                                        <p className="font-semibold mb-1">⚠️ Possible reasons:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li><strong>Payment issue (error 131042):</strong> Your Meta Business account has a payment problem. Go to <a href="https://business.facebook.com" target="_blank" rel="noreferrer" className="underline">Meta Business Manager</a> → Settings → Billing to fix it.</li>
                                            <li>Recipients may not have WhatsApp or may have blocked your number.</li>
                                            <li>Your WhatsApp Business account may not be verified.</li>
                                        </ul>
                                    </div>
                                </>
                            ) : partialSuccess ? (
                                <>
                                    <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-slate-700 mb-2">Partial Success</h3>
                                    <div className="flex justify-center gap-6 mb-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-600">{sentCount}</p>
                                            <p className="text-xs text-slate-500">Sent</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                                            <p className="text-xs text-slate-500">Failed</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-slate-700 mb-2">
                                        {jobResult ? `${sentCount} Messages Sent!` : 'Bulk Send Queued!'}
                                    </h3>
                                    <p className="text-slate-500 mb-4">
                                        {jobResult
                                            ? `Successfully sent to ${sentCount} out of ${totalContacts} contacts.`
                                            : `Messages are being sent to ${totalContacts} contacts in the background.`}
                                    </p>
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                        Messages were sent with rate limiting (~12 messages/second) to comply with Meta's limits.
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-700 mb-2">Failed to Start Bulk Send</h3>
                            <p className="text-red-600 mb-4">{error}</p>
                            <button onClick={() => setStep('select')} className="btn-secondary">
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                <div className="dialog-footer">
                    {step === 'select' && (
                        <>
                            <button onClick={handleClose} className="btn-secondary">Cancel</button>
                            <button
                                onClick={handleNext}
                                disabled={!selectedTemplate || !selectedSegment || sendMutation.isPending}
                                className="btn-primary"
                            >
                                {hasVariables ? (
                                    <><ChevronRight className="w-4 h-4" /> Next: Fill Variables</>
                                ) : (
                                    <><Send className="w-4 h-4" /> Start Bulk Send</>
                                )}
                            </button>
                        </>
                    )}
                    {step === 'variables' && (
                        <>
                            <button onClick={() => setStep('select')} className="btn-secondary">← Back</button>
                            <button
                                onClick={doSend}
                                disabled={!allVariablesFilled || sendMutation.isPending}
                                className="btn-primary"
                                title={!allVariablesFilled ? 'Please fill in all variables' : ''}
                            >
                                <Send className="w-4 h-4" />
                                Send to {selectedSegmentData?.contact_count || 0} Contacts
                            </button>
                        </>
                    )}
                    {(step === 'result' || step === 'error') && (
                        <button onClick={handleClose} className="btn-primary w-full">Close</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkSendDialog;
