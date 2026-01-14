"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { 
    fetchSubscriptionDetails, 
    getCurrentUsage, 
    getPlatformPackageLimits, 
    fetchSubscriptionInvoices,
    SubscriptionDetails,
    PackageLimits,
    UsageStats,
    SubscriptionInvoice
} from "@/services/subscription-service"
import { format, differenceInDays } from "date-fns"

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

// Icons
import { 
    CreditCard, Users, Briefcase, HardDrive, 
    AlertTriangle, Download, Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function SubscriptionPage() {
    const { userData } = useAuth()
    const [loading, setLoading] = useState(true)
    
    // Data States
    const [subDetails, setSubDetails] = useState<SubscriptionDetails | null>(null)
    const [limits, setLimits] = useState<PackageLimits | null>(null)
    const [usage, setUsage] = useState<UsageStats | null>(null)
    const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([])

    useEffect(() => {
        const loadData = async () => {
            if (!userData?.studioID) return;
            setLoading(true);
            try {
                // 1. Fetch Config
                const details = await fetchSubscriptionDetails(userData.studioID);
                setSubDetails(details);

                if (details) {
                    // 2. Fetch Package Limits
                    const pkgLimits = await getPlatformPackageLimits(details.planId);
                    setLimits(pkgLimits);
                }

                // 3. Fetch Real Usage
                const currentUsage = await getCurrentUsage(userData.studioID);
                setUsage(currentUsage);

                // 4. Fetch Invoices
                const invs = await fetchSubscriptionInvoices(userData.studioID);
                setInvoices(invs);

            } catch (error) {
                console.error("Failed to load subscription data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userData]);

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1C4D8D]" /></div>;

    // Days Remaining Calculation
    const daysRemaining = subDetails ? differenceInDays(subDetails.nextRenewalDate, new Date()) : 0;
    const isUrgent = daysRemaining <= 7;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 pb-20">
            
            {/* PAGE HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#0F2854]">Subscription & Billing</h1>
                    <p className="text-slate-500">Manage your studio plan, usage, and invoices.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline">Billing Settings</Button>
                    {subDetails?.status === 'active' ? (
                        <Button className="bg-[#1C4D8D] hover:bg-[#153a6b]">Change Plan</Button>
                    ) : (
                        <Button className="bg-red-600 hover:bg-red-700 text-white">Reactivate Subscription</Button>
                    )}
                </div>
            </div>

            {/* 1. HERO: CURRENT SUBSCRIPTION OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-l-4 border-l-[#1C4D8D] shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl text-[#0F2854] flex items-center gap-3">
                                    {subDetails?.planName}
                                    <Badge className={cn(
                                        "uppercase text-[10px] tracking-wider", 
                                        subDetails?.status === 'active' ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"
                                    )}>
                                        {subDetails?.status}
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Billed {subDetails?.interval} • Next renewal on {format(subDetails?.nextRenewalDate || new Date(), "MMMM dd, yyyy")}
                                </CardDescription>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-slate-800">
                                    LKR {subDetails?.amount.toLocaleString()}
                                    <span className="text-sm font-normal text-slate-400">/{subDetails?.interval === 'yearly' ? 'yr' : 'mo'}</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Billing Cycle Progress */}
                        <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <span className={cn(isUrgent ? "text-amber-600" : "text-slate-600")}>
                                    {daysRemaining < 0 ? "Overdue" : `${daysRemaining} Days Remaining`}
                                </span>
                                <span className="text-slate-400">Auto-renewal enabled</span>
                            </div>
                            {/* Visual Progress Bar (Approximate month length) */}
                            <Progress value={Math.max(0, Math.min(100, (30 - daysRemaining) * 3.33))} className={cn("h-2", isUrgent ? "bg-amber-100 [&>div]:bg-amber-500" : "bg-slate-100 [&>div]:bg-[#1C4D8D]")} />
                        </div>
                        
                        {subDetails?.status === 'past_due' && (
                            <Alert variant="destructive" className="mt-4 bg-red-50 border-red-200">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Payment Past Due</AlertTitle>
                                <AlertDescription>Your subscription features may be limited soon. Please pay the outstanding invoice.</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions Card */}
                <Card className="bg-slate-50 border-slate-200 flex flex-col justify-center items-center text-center p-6 space-y-4">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                        <CreditCard className="w-8 h-8 text-[#1C4D8D]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700">Payment Method</h3>
                        <p className="text-xs text-slate-500 mt-1">Visa ending in **** 4242</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">Update Method</Button>
                </Card>
            </div>

            {/* 2. USAGE & LIMITS */}
            <div>
                <h2 className="text-xl font-bold text-[#0F2854] mb-4">Plan Usage</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Events Usage */}
                    <UsageCard 
                        title="Active Events" 
                        icon={<Briefcase className="w-5 h-5 text-blue-600"/>}
                        used={usage?.eventsUsed || 0}
                        limit={limits?.events_limit || 0}
                        unit="events"
                    />
                    
                    {/* Users Usage */}
                    <UsageCard 
                        title="Team Members" 
                        icon={<Users className="w-5 h-5 text-purple-600"/>}
                        used={usage?.usersUsed || 0}
                        limit={limits?.users_limit || 0}
                        unit="users"
                    />

                    {/* Storage/Photos Usage */}
                    <UsageCard 
                        title="Photos/Storage" 
                        icon={<HardDrive className="w-5 h-5 text-amber-600"/>}
                        used={0} // Placeholder until photo service is ready
                        limit={limits?.photos_per_event ? "Unlimited" : "5GB"} 
                        unit=""
                        hideProgress={true}
                        customText={limits?.photos_per_event ? `${limits.photos_per_event} photos/event` : "5GB / 10GB"}
                    />
                </div>
            </div>

            <Separator />

            {/* 3. INVOICES TABLE */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[#0F2854]">Invoices</h2>
                    <Button variant="ghost" size="sm" className="text-slate-500">View All</Button>
                </div>
                
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length > 0 ? (
                                invoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                                        <TableCell>{format(inv.issueDate, "MMM dd, yyyy")}</TableCell>
                                        <TableCell>LKR {inv.amount.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "capitalize",
                                                inv.status === 'paid' ? "bg-green-50 text-green-700 border-green-200" :
                                                inv.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                "bg-red-50 text-red-700 border-red-200"
                                            )}>
                                                {inv.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {inv.status === 'pending' ? (
                                                <Button size="sm" className="bg-[#1C4D8D]">Pay Now</Button>
                                            ) : (
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Download className="w-4 h-4 text-slate-400"/></Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    )
}

// --- SUB-COMPONENT: USAGE CARD ---
function UsageCard({ title, icon, used, limit, unit, hideProgress, customText }: any) {
    const isUnlimited = limit === 0 || limit === "Unlimited";
    const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
    const isNearLimit = percentage > 80;

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
                    {isNearLimit && !isUnlimited && <Badge variant="destructive" className="text-[10px]">Near Limit</Badge>}
                </div>
                <div className="space-y-1">
                    <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</h4>
                    <div className="text-2xl font-bold text-slate-800">
                        {customText ? customText : (
                            <>
                                {used} <span className="text-sm text-slate-400 font-normal">/ {isUnlimited ? "∞" : limit} {unit}</span>
                            </>
                        )}
                    </div>
                </div>
                {!hideProgress && !isUnlimited && (
                    <Progress value={percentage} className={cn("h-1.5 mt-4", isNearLimit ? "bg-red-100 [&>div]:bg-red-500" : "bg-slate-100 [&>div]:bg-blue-600")} />
                )}
            </CardContent>
        </Card>
    )
}