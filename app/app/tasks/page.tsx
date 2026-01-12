"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
// Event Service Imports
import { fetchEvents, EventData } from "@/services/event-service"
// Task Service Imports (Ensure you have created task-service.ts based on previous steps)
import { fetchStudioTasks, updateTaskStatus, createTask, updateTaskDetails, StudioTask } from "@/services/task-service"

import { 
    format, isSameDay, isAfter, isBefore, startOfToday, endOfToday 
} from "date-fns"

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// DND Kit (For Kanban)
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core"

// Icons
import { 
    Loader2, Search, Calendar as CalendarIcon, MapPin, 
    ArrowRight, User, PartyPopper, History,
    Phone, MessageCircle, MessageSquareText,
    ImageIcon, Clock, ExternalLink, ChevronRight,
    Plus, AlertCircle, CheckCircle2, ListTodo, KanbanSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

// --- HELPER: SAFE DATE ---
const safeDate = (dateInput: any): Date => {
    try {
        if (!dateInput) return new Date();
        if (typeof dateInput.toDate === 'function') return dateInput.toDate();
        return new Date(dateInput);
    } catch { return new Date(); }
};

// ==================================================================================
// MAIN PAGE COMPONENT
// ==================================================================================

export default function MyTasksPage() {
    const { userData, currentUser } = useAuth();
    
    // Main Tab State
    const [mainTab, setMainTab] = useState("assignments");

    if (!userData || !currentUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 min-h-screen bg-slate-50/50 space-y-6 pb-24">
            
            {/* MAIN HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#0F2854]">Workspace</h1>
                    <p className="text-slate-500 text-sm">Manage your event assignments and studio tasks.</p>
                </div>
            </div>

            {/* TOP LEVEL TABS */}
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 bg-white border border-slate-200 shadow-sm p-1">
                    <TabsTrigger value="assignments" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-100 flex items-center gap-2">
                        <ListTodo className="w-4 h-4" /> My Assignments
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-100 flex items-center gap-2">
                        <KanbanSquare className="w-4 h-4" /> Studio Tasks
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: ASSIGNED EVENTS (Original View) */}
                <TabsContent value="assignments" className="outline-none">
                    <MyAssignmentsView userData={userData} currentUser={currentUser} />
                </TabsContent>

                {/* TAB 2: STUDIO TASKS (Kanban View) */}
                <TabsContent value="tasks" className="outline-none">
                    <StudioTasksView userData={userData} currentUser={currentUser} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ==================================================================================
// SUB-COMPONENT: MY ASSIGNMENTS VIEW (Event Based)
// ==================================================================================

function MyAssignmentsView({ userData, currentUser }: { userData: any, currentUser: any }) {
    const router = useRouter()
    const [allEvents, setAllEvents] = useState<EventData[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("today")

    useEffect(() => {
        const loadMyTasks = async () => {
            if (userData?.studioID && currentUser?.uid) {
                setLoading(true);
                try {
                    const events = await fetchEvents(userData.studioID);
                    const myEvents = events.filter(event => event.assignedCrew?.includes(currentUser.uid));
                    setAllEvents(myEvents);
                } catch (error) {
                    console.error("Failed to load tasks", error);
                } finally {
                    setLoading(false);
                }
            }
        }
        loadMyTasks();
    }, [userData, currentUser]);

    const { todayTasks, upcomingTasks, pastTasks } = useMemo(() => {
        const today = startOfToday();
        const endToday = endOfToday();
        const todayList: any[] = [];
        const upcomingList: any[] = [];
        const pastList: any[] = [];

        const filtered = allEvents.filter(e => {
            const query = searchQuery.toLowerCase();
            return (
                e.eventName?.toLowerCase().includes(query) ||
                e.customerName?.toLowerCase().includes(query) ||
                e.displayId?.toLowerCase().includes(query)
            );
        });

        filtered.forEach(event => {
            if (!event.days || event.days.length === 0) return;
            const sortedDays = [...event.days].sort((a, b) => safeDate(a.date).getTime() - safeDate(b.date).getTime());

            sortedDays.forEach((dayConfig, index) => {
                const dayDate = safeDate(dayConfig.date);
                const taskItem = { event, relevantDate: dayDate, dayIndex: index + 1 };

                if (isSameDay(dayDate, today)) todayList.push(taskItem);
                else if (isAfter(dayDate, endToday)) upcomingList.push(taskItem);
                else if (isBefore(dayDate, today)) pastList.push(taskItem);
            });
        });
        
        const sortByDate = (a: any, b: any) => a.relevantDate.getTime() - b.relevantDate.getTime();
        const sortByDateDesc = (a: any, b: any) => b.relevantDate.getTime() - a.relevantDate.getTime();

        return {
            todayTasks: todayList.sort(sortByDate),
            upcomingTasks: upcomingList.sort(sortByDate),
            pastTasks: pastList.sort(sortByDateDesc)
        };
    }, [allEvents, searchQuery]);

    const getStatusStyles = (status: string) => {
        const s = status?.toLowerCase() || "";
        if (s.includes('complet')) return "bg-green-100 text-green-700 border-green-200";
        if (s.includes('progress') || s.includes('shoot')) return "bg-blue-100 text-blue-700 border-blue-200";
        if (s.includes('edit') || s.includes('post')) return "bg-purple-100 text-purple-700 border-purple-200";
        if (s.includes('cancel')) return "bg-red-100 text-red-700 border-red-200";
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    const AssignmentCard = ({ data }: { data: any }) => {
        const { event, relevantDate, dayIndex } = data;
        const cleanPhone = event.customerMobile?.replace(/[^0-9]/g, "") || "";
        const dayLocation = event.locations?.find((l: any) => isSameDay(safeDate(l.date), relevantDate));
        const totalDays = event.days?.length || 1;

        return (
            <Card className="group cursor-pointer hover:shadow-xl transition-all border-slate-200 hover:border-blue-300 overflow-hidden bg-white p-0" onClick={() => router.push(`/app/events/${event.id}`)}>
                <div className="flex flex-col sm:flex-row h-full min-h-[160px]">
                    <div className="w-full sm:w-48 h-48 sm:h-auto bg-slate-100 relative shrink-0">
                        {event.couplePhotoUrl ? (
                            <img src={event.couplePhotoUrl} alt="Cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50"><ImageIcon className="w-12 h-12 opacity-30" /></div>
                        )}
                        <div className="absolute top-2 right-2 sm:hidden"><Badge className={cn("shadow-sm", getStatusStyles(event.status))}>{event.status}</Badge></div>
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-between gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 rounded-sm font-mono text-[10px] px-1.5">{event.displayId || "ID"}</Badge>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.eventType}</span>
                                {totalDays > 1 && <Badge className="bg-amber-100 text-amber-700 border-amber-200 h-5 text-[10px] px-1.5">Day {dayIndex} of {totalDays}</Badge>}
                            </div>
                            <div className="hidden sm:block"><Badge variant="outline" className={cn("font-medium", getStatusStyles(event.status))}>{event.status}</Badge></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-[#0F2854] text-xl leading-tight group-hover:text-[#1C4D8D] transition-colors mb-1">{event.eventName}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium"><User className="w-4 h-4 text-slate-400" />{event.customerName}</div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1.5 border-slate-200 text-slate-600 hover:text-blue-600 bg-white" onClick={(e) => { e.stopPropagation(); window.open(`tel:${event.customerMobile}`, '_self'); }} disabled={!event.customerMobile}><Phone className="h-3 w-3" /> Call</Button>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1.5 border-slate-200 text-slate-600 hover:text-green-600 bg-white" onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${cleanPhone}`, '_blank'); }} disabled={!cleanPhone}><MessageCircle className="h-3 w-3" /> WhatsApp</Button>
                        </div>
                        <div className="mt-auto pt-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-xs font-medium w-full text-slate-600">
                                <CalendarIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="font-semibold text-blue-900">{format(relevantDate, "EEE, MMM do")}</span>
                                {dayLocation && (<><span className="text-slate-300">|</span><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate flex-1">{dayLocation.name}</span></>)}
                            </div>
                        </div>
                        <div className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 text-slate-200 group-hover:text-blue-100 pointer-events-none transition-colors"><ChevronRight className="w-8 h-8" /></div>
                    </div>
                </div>
            </Card>
        )
    };

    if (loading) return <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>;

    return (
        <div className="space-y-6">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search assigned events..." className="pl-9 bg-white border-slate-200" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/80 p-1">
                    <TabsTrigger value="today" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Today {todayTasks.length > 0 && <Badge className="ml-2 bg-blue-100 text-blue-700 border-0 h-5 px-1.5 text-[10px]">{todayTasks.length}</Badge>}</TabsTrigger>
                    <TabsTrigger value="upcoming" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Upcoming {upcomingTasks.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">{upcomingTasks.length}</Badge>}</TabsTrigger>
                    <TabsTrigger value="past" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Past</TabsTrigger>
                </TabsList>

                <TabsContent value="today" className="space-y-4">
                    {todayTasks.length > 0 ? todayTasks.map((item, i) => <AssignmentCard key={`${item.event.id}_t_${i}`} data={item} />) : <EmptyState title="You're all clear today!" sub="No events assigned for today." icon={<PartyPopper className="w-6 h-6 text-green-600"/>} />}
                </TabsContent>
                <TabsContent value="upcoming" className="space-y-4">
                    {upcomingTasks.length > 0 ? upcomingTasks.map((item, i) => <AssignmentCard key={`${item.event.id}_u_${i}`} data={item} />) : <EmptyState title="No upcoming events" sub="Your schedule is free for now." icon={<CalendarIcon className="w-6 h-6 text-blue-400"/>} />}
                </TabsContent>
                <TabsContent value="past" className="space-y-4">
                    {pastTasks.length > 0 ? pastTasks.map((item, i) => <AssignmentCard key={`${item.event.id}_p_${i}`} data={item} />) : <EmptyState title="No past events" sub="History will appear here." icon={<History className="w-6 h-6 text-slate-400"/>} />}
                </TabsContent>
            </Tabs>
        </div>
    )
}

const EmptyState = ({ title, sub, icon }: any) => (
    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-100">{icon}</div>
        <h3 className="text-lg font-bold text-slate-700">{title}</h3>
        <p className="text-slate-500 text-sm mt-1">{sub}</p>
    </div>
);

// ==================================================================================
// SUB-COMPONENT: STUDIO TASKS VIEW (Kanban Board)
// ==================================================================================

const COLUMNS = [
    { id: "todo", title: "To Do", color: "bg-slate-100/50 border-slate-200" },
    { id: "in_progress", title: "In Progress", color: "bg-blue-50/50 border-blue-100" },
    { id: "review", title: "Review", color: "bg-amber-50/50 border-amber-100" },
    { id: "completed", title: "Done", color: "bg-green-50/50 border-green-100" }
];

function StudioTasksView({ userData, currentUser }: { userData: any, currentUser: any }) {
    const [tasks, setTasks] = useState<StudioTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<StudioTask | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    useEffect(() => {
        if(userData?.studioID) loadTasks();
    }, [userData]);

    const loadTasks = async () => {
        setLoading(true);
        const data = await fetchStudioTasks(userData.studioID);
        setTasks(data);
        setLoading(false);
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    }, [tasks, search]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (!over || !userData?.studioID) return;

        const taskId = active.id as string;
        const newStatus = over.id as string;
        const task = tasks.find(t => t.id === taskId);

        if (task && task.status !== newStatus) {
            const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t);
            setTasks(updatedTasks);
            try {
                await updateTaskStatus(userData.studioID, taskId, newStatus, { uid: userData.uid, name: userData.displayName || 'User' });
            } catch (error) {
                console.error("Failed to update status", error);
                loadTasks(); 
            }
        }
    };

    const handleSaveTask = async (taskData: any) => {
        if (!userData?.studioID) return;
        try {
            if (editingTask?.id) {
                await updateTaskDetails(userData.studioID, editingTask.id, taskData);
            } else {
                await createTask(userData.studioID, taskData, { 
                    uid: userData.uid, name: userData.displayName || 'User', role: userData.role || 'Member' 
                });
            }
            setIsDialogOpen(false);
            loadTasks();
            Swal.fire({ icon: 'success', title: 'Success', timer: 1500, showConfirmButton: false });
        } catch (e) {
            Swal.fire('Error', 'Could not save task', 'error');
        }
    };

    if (loading) return <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>;

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search studio tasks..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button onClick={() => { setEditingTask(null); setIsDialogOpen(true); }} className="bg-[#1C4D8D]">
                    <Plus className="w-4 h-4 mr-2" /> Create Task
                </Button>
            </div>

            {/* Board */}
            <DndContext onDragEnd={handleDragEnd} onDragStart={(e) => setActiveDragId(e.active.id as string)}>
                <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
                    {COLUMNS.map(col => (
                        <TaskColumn 
                            key={col.id} 
                            id={col.id} 
                            title={col.title} 
                            color={col.color}
                            tasks={filteredTasks.filter(t => t.status === col.id)}
                            onTaskClick={(t) => { setEditingTask(t); setIsDialogOpen(true); }}
                        />
                    ))}
                </div>
                <DragOverlay>
                    {activeDragId ? (
                        <div className="opacity-80 rotate-2 cursor-grabbing w-[280px]">
                            <Card className="shadow-xl ring-2 ring-blue-500 bg-white">
                                <CardContent className="p-3">
                                    <span className="font-medium text-sm">{tasks.find(t => t.id === activeDragId)?.title}</span>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Task Dialog */}
            <TaskFormDialog 
                open={isDialogOpen} 
                onOpenChange={setIsDialogOpen} 
                initialData={editingTask} 
                onSave={handleSaveTask}
            />
        </div>
    );
}

// Kanban Sub-Components
const TaskColumn = ({ id, title, tasks, color, onTaskClick }: any) => {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={cn("flex-1 min-w-[280px] rounded-xl border p-2 h-full bg-slate-50/50", color)}>
            <div className="flex items-center justify-between px-2 py-2 mb-2">
                <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">{title}</h3>
                <Badge variant="outline" className="bg-white border-slate-200">{tasks.length}</Badge>
            </div>
            <div className="flex flex-col gap-2 min-h-[100px]">
                {tasks.map((task: any) => <DraggableTaskCard key={task.id} task={task} onClick={onTaskClick} />)}
            </div>
        </div>
    );
};

const DraggableTaskCard = ({ task, onClick }: any) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
    
    return (
        <Card 
            ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={() => onClick(task)}
            className={cn("cursor-grab active:cursor-grabbing hover:shadow-md transition-all bg-white border-slate-200", isDragging && "opacity-50")}
        >
            <CardContent className="p-3 space-y-2">
                <div className="font-medium text-sm leading-tight text-slate-800">{task.title}</div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 text-[10px]"><AvatarFallback className="bg-slate-100 text-slate-600">{task.assignedTo?.name?.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                        {task.dueDate && <span className={cn("text-[10px] flex items-center gap-1", safeDate(task.dueDate) < new Date() && task.status !== 'completed' ? "text-red-500 font-bold" : "text-slate-400")}><Clock className="w-3 h-3"/>{format(safeDate(task.dueDate), "MMM dd")}</span>}
                    </div>
                    <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 h-5", task.priority === 'urgent' ? "bg-red-100 text-red-700" : task.priority === 'high' ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600")}>{task.priority}</Badge>
                </div>
            </CardContent>
        </Card>
    );
};

function TaskFormDialog({ open, onOpenChange, initialData, onSave }: any) {
    // In a real app, fetch users list here
    const [members] = useState([{ uid: "user1", name: "User A" }, { uid: "user2", name: "User B" }]); 
    const [formData, setFormData] = useState({ title: "", description: "", priority: "medium", assignedToUid: "", dueDate: undefined as Date | undefined });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title, description: initialData.description || "",
                priority: initialData.priority, assignedToUid: initialData.assignedTo?.uid || "",
                dueDate: initialData.dueDate ? safeDate(initialData.dueDate) : undefined
            });
        } else {
            setFormData({ title: "", description: "", priority: "medium", assignedToUid: "", dueDate: undefined });
        }
    }, [initialData, open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader><DialogTitle>{initialData ? "Edit Task" : "Create New Task"}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2"><Label>Title</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Task title" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Priority</Label><Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><Label>Assign To</Label><Select value={formData.assignedToUid} onValueChange={v => setFormData({...formData, assignedToUid: v})}><SelectTrigger><SelectValue placeholder="Select Member" /></SelectTrigger><SelectContent>{members.map(m => <SelectItem key={m.uid} value={m.uid}>{m.name}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="space-y-2"><Label>Due Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.dueDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.dueDate ? format(formData.dueDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.dueDate} onSelect={(d) => setFormData({...formData, dueDate: d})} initialFocus /></PopoverContent></Popover></div>
                    <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Details..." className="h-24" /></div>
                </div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button className="bg-[#1C4D8D]" onClick={() => {
                    if(!formData.title) return Swal.fire("Error", "Title required", "warning");
                    const assignee = members.find(m => m.uid === formData.assignedToUid) || { uid: "self", name: "Me" };
                    onSave({ ...formData, assignedTo: { uid: assignee.uid, name: assignee.name } });
                }}>{initialData ? "Save Changes" : "Create Task"}</Button></div>
            </DialogContent>
        </Dialog>
    );
}