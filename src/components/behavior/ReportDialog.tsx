import { useState } from 'react';
import { BehaviorService } from '@/services/BehaviorService';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reportedUserId: string;
    reportedUserName: string;
}

export const ReportDialog = ({ open, onOpenChange, reportedUserId, reportedUserName }: ReportDialogProps) => {
    const { user } = useAuth();
    const [category, setCategory] = useState<string>('toxicity');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!user) return;
        if (description.length < 10) {
            toast({ title: 'Description too short', description: 'Please provide more details.', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            await BehaviorService.submitReport(user.id, reportedUserId, category, description);
            toast({ 
                title: 'Report Submitted', 
                description: 'Thank you for helping keep Cospira safe. Our AI systems will investigate.',
                variant: 'default'
            }); // Using default variant as success isn't standard in shadcn sometimes, or just standard toast
            onOpenChange(false);
            setDescription('');
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-red-900/50 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                        <ShieldAlert className="w-5 h-5" />
                        Report Player
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Reporting <span className="text-white font-bold">{reportedUserName}</span>. 
                        False reports may result in account penalties.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Violation Category</label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="bg-slate-800 border-slate-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                <SelectItem value="toxicity">Toxicity / Verbal Abuse</SelectItem>
                                <SelectItem value="cheating">Cheating / Hacking</SelectItem>
                                <SelectItem value="afk">Intentional AFK / Griefing</SelectItem>
                                <SelectItem value="spam">Spam / Scam</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what happened..."
                            className="bg-slate-800 border-slate-700 min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={submitting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {submitting ? 'Submitting...' : 'Submit Report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
