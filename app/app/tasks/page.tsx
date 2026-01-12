"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { fetchEvents, EventData } from "@/services/event-service"
import { 
    fetchStudioTasks, updateTaskStatus, createTask, updateTaskDetails, addWorkNote, getStudioMembersForTasks, deleteTask,
    StudioTask, TaskUser 
} from "@/services/task-service"

import { format, isSameDay, isAfter, isBefore, startOfToday, endOfToday, formatDistanceToNow } from "date-fns"

// UI Components
import { Card, CardContent } from "@/components/ui/card"
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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// DND Kit
import { 
    DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable,
    useSensor, useSensors, PointerSensor, KeyboardSensor 
} from "@dnd-kit/core"

// Icons
import { 
    Loader2, Search, Calendar as CalendarIcon, MapPin, 
    User, PartyPopper, History,
    Phone, MessageCircle, MessageSquareText,
    ImageIcon, Clock, ChevronRight,
    Plus, ListTodo, KanbanSquare, Send, MoreHorizontal, Trash2, Edit, Eye
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
    const [mainTab, setMainTab] = useState("assignments");

    if (!userData || !currentUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1C4D8D]" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 min-h-screen bg-slate-50/50 space-y-6 pb-24">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#0F2854]">Workspace</h1>
                    <p className="text-slate-500 text-sm">Manage your event assignments and studio tasks.</p>
                </div>
            </div>

            {/* TABS */}
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                <div className="flex justify-center md:justify-start w-full">
                    <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-8 bg-white border border-slate-200 shadow-sm p-1 rounded-lg h-11">
                        <TabsTrigger value="assignments" className="h-9 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-100 flex items-center justify-center gap-2 rounded-md transition-all">
                            <ListTodo className="w-4 h-4" /> My Assignments
                        </TabsTrigger>
                        <TabsTrigger value="tasks" className="h-9 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-100 flex items-center justify-center gap-2 rounded-md transition-all">
                            <KanbanSquare className="w-4 h-4" /> Studio Tasks
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="assignments" className="outline-none mt-0">
                    <MyAssignmentsView userData={userData} currentUser={currentUser} />
                </TabsContent>

                <TabsContent value="tasks" className="outline-none mt-0">
                    <StudioTasksView userData={userData} currentUser={currentUser} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ==================================================================================
// SUB-COMPONENT: MY ASSIGNMENTS VIEW
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

    const EmptyState = ({ title, sub, icon }: any) => (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-100">{icon}</div>
            <h3 className="text-lg font-bold text-slate-700">{title}</h3>
            <p className="text-slate-500 text-sm mt-1">{sub}</p>
        </div>
    );

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
    
    // UI States
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<StudioTask | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // [!code highlight] Configured Sensors for Drag Delay
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required to start drag
            },
        }),
        useSensor(KeyboardSensor)
    );

    // Data Lists
    const [members, setMembers] = useState<TaskUser[]>([]);
    const [events, setEvents] = useState<EventData[]>([]);

    useEffect(() => {
        if(userData?.studioID) {
            loadTasks();
            loadAuxData();
        }
    }, [userData]);

    const loadTasks = async () => {
        setLoading(true);
        const { tasks } = await fetchStudioTasks(userData.studioID);
        setTasks(tasks);
        setLoading(false);
    };

    const loadAuxData = async () => {
        const mems = await getStudioMembersForTasks(userData.studioID); 
        const evts = await fetchEvents(userData.studioID);
        setMembers(mems);
        setEvents(evts);
    };

    const filteredTasks = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return tasks.filter(t => 
            t.title.toLowerCase().includes(lowerSearch) || 
            t.assignedTo.some(u => u.name.toLowerCase().includes(lowerSearch))
        );
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
                await updateTaskStatus(
                    userData.studioID, 
                    taskId, 
                    newStatus, 
                    { uid: currentUser.uid, name: currentUser.displayName || 'User' }
                );
            } catch (error) {
                console.error("Failed to update status", error);
                loadTasks(); 
            }
        }
    };

    // Shared Handle Delete
    const handleDelete = async (taskId: string) => {
        if (!userData?.studioID) return;
        const result = await Swal.fire({
            title: 'Delete Task?', text: 'This cannot be undone.', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, delete'
        });

        if (result.isConfirmed) {
            try {
                await deleteTask(userData.studioID, taskId);
                setTasks(prev => prev.filter(t => t.id !== taskId));
                setSelectedTask(null);
                Swal.fire('Deleted', 'Task has been removed', 'success');
            } catch (error) {
                Swal.fire('Error', 'Failed to delete task', 'error');
            }
        }
    };

    // Open Edit Dialog
    const [editingTask, setEditingTask] = useState<StudioTask | null>(null);
    const handleEdit = (task: StudioTask) => {
        setSelectedTask(null); 
        setEditingTask(task);
        setIsCreateDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search tasks or people..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button onClick={() => { setEditingTask(null); setIsCreateDialogOpen(true); }} className="bg-[#1C4D8D]">
                    <Plus className="w-4 h-4 mr-2" /> Create Task
                </Button>
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={(e) => setActiveDragId(e.active.id as string)}>
                <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
                    {COLUMNS.map(col => (
                        <TaskColumn 
                            key={col.id} 
                            id={col.id} 
                            title={col.title} 
                            color={col.color}
                            tasks={filteredTasks.filter(t => t.status === col.id)}
                            onTaskClick={(t: StudioTask) => setSelectedTask(t)}
                            onEdit={(t: StudioTask) => handleEdit(t)}
                            onDelete={(id: string) => handleDelete(id)}
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

            {/* Create / Edit Dialog */}
            <TaskFormDialog 
                open={isCreateDialogOpen} 
                onOpenChange={setIsCreateDialogOpen} 
                initialData={editingTask}
                members={members}
                events={events}
                onSave={async (taskData: any) => {
                    if (editingTask?.id) {
                        await updateTaskDetails(userData.studioID, editingTask.id, taskData);
                    } else {
                        await createTask(userData.studioID, taskData, { 
                            uid: currentUser.uid, 
                            name: currentUser.displayName || 'User', 
                            role: userData.role || 'Member' 
                        });
                    }
                    loadTasks();
                    setIsCreateDialogOpen(false);
                }}
            />

            {/* Detail View Dialog */}
            {selectedTask && (
                <TaskDetailDialog 
                    open={!!selectedTask}
                    onOpenChange={(open: boolean) => !open && setSelectedTask(null)}
                    task={selectedTask}
                    currentUser={{ uid: currentUser.uid, name: currentUser.displayName || 'User' }}
                    studioId={userData.studioID}
                    onUpdate={loadTasks}
                    onEdit={() => handleEdit(selectedTask)}
                    onDelete={() => handleDelete(selectedTask.id!)}
                />
            )}
        </div>
    );
}

// --- KANBAN CARD ---
const DraggableTaskCard = ({ task, onClick, onEdit, onDelete }: any) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id!, data: { task } });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
    
    return (
        <Card 
            ref={setNodeRef} style={style} {...listeners} {...attributes}
            className={cn("relative group hover:shadow-md transition-all bg-white border-slate-200", isDragging && "opacity-50")}
        >
            <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                    <div className="font-medium text-sm leading-tight text-slate-800 line-clamp-2 cursor-pointer hover:text-blue-600" onClick={() => onClick(task)}>{task.title}</div>
                    
                    {/* [!code highlight] Fixed Actions Area */}
                    <div 
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-white/90 rounded p-0.5 shadow-sm"
                        onPointerDown={(e) => e.stopPropagation()} // Stop Drag Trigger
                        onClick={(e) => e.stopPropagation()} // Stop Click Propagation
                    >
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={(e) => { e.stopPropagation(); onClick(task); }}>
                            <Eye className="w-3 h-3" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-700">
                                    <MoreHorizontal className="w-3 h-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(task); }}><Edit className="w-3 h-3 mr-2"/> Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}><Trash2 className="w-3 h-3 mr-2"/> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-2 cursor-pointer" onClick={() => onClick(task)}>
                    <div className="flex items-center -space-x-2">
                        {task.assignedTo.slice(0, 3).map((u:any, i:number) => (
                            <Avatar key={i} className="h-6 w-6 border-2 border-white ring-1 ring-slate-100"><AvatarFallback className="bg-slate-200 text-slate-600 text-[9px]">{u.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                        ))}
                        {task.assignedTo.length > 3 && <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] text-slate-500">+{task.assignedTo.length - 3}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                        {task.dueDate && <span className={cn("text-[10px] flex items-center gap-1", safeDate(task.dueDate) < new Date() && task.status !== 'completed' ? "text-red-500 font-bold" : "text-slate-400")}><Clock className="w-3 h-3"/>{format(safeDate(task.dueDate), "MMM dd")}</span>}
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 h-5", task.priority === 'urgent' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")}>{task.priority}</Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const TaskColumn = ({ id, title, tasks, color, onTaskClick, onEdit, onDelete }: any) => {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={cn("flex-1 min-w-[280px] rounded-xl border p-2 h-full bg-slate-50/50 flex flex-col", color)}>
            <div className="flex items-center justify-between px-2 py-2 mb-2">
                <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">{title}</h3>
                <Badge variant="outline" className="bg-white border-slate-200 shadow-sm">{tasks.length}</Badge>
            </div>
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-2 min-h-[100px] p-1">
                    {tasks.map((task: any) => (
                        <DraggableTaskCard 
                            key={task.id} 
                            task={task} 
                            onClick={onTaskClick}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

// ==================================================================================
// DIALOGS
// ==================================================================================

function TaskFormDialog({ open, onOpenChange, members, events, onSave, initialData }: any) {
    const [formData, setFormData] = useState<any>({ 
        title: "", description: "", priority: "medium", 
        assignedToIds: [], dueDate: undefined,
        linkEvent: false, linkedEventId: ""
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                description: initialData.description || "",
                priority: initialData.priority,
                assignedToIds: initialData.assignedTo?.map((u:any) => u.uid) || [],
                dueDate: initialData.dueDate ? safeDate(initialData.dueDate) : undefined,
                linkEvent: !!initialData.linkedEventId,
                linkedEventId: initialData.linkedEventId || ""
            });
        } else {
            setFormData({ 
                title: "", description: "", priority: "medium", 
                assignedToIds: [], dueDate: undefined,
                linkEvent: false, linkedEventId: ""
            });
        }
    }, [initialData, open]);

    const handleSubmit = () => {
        if(!formData.title) return Swal.fire("Error", "Title required", "warning");
        if(formData.assignedToIds.length === 0) return Swal.fire("Error", "Assign at least one member", "warning");

        const selectedMembers = members.filter((m: any) => formData.assignedToIds.includes(m.uid));
        const linkedEvent = formData.linkEvent ? events.find((e:any) => e.id === formData.linkedEventId) : null;

        onSave({
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            status: initialData ? initialData.status : "todo", 
            assignedTo: selectedMembers.map((m:any) => ({ uid: m.uid, name: m.name })),
            dueDate: formData.dueDate,
            linkedEventId: linkedEvent?.id || null,
            linkedEventName: linkedEvent?.eventName || null
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader><DialogTitle>{initialData ? "Edit Task" : "Create New Task"}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2"><Label>Title</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Task title" /></div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Priority</Label><Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><Label>Due Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.dueDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.dueDate ? format(formData.dueDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.dueDate} onSelect={(d) => setFormData({...formData, dueDate: d})} initialFocus /></PopoverContent></Popover></div>
                    </div>

                    <div className="space-y-2">
                        <Label>Assign To (Multiple)</Label>
                        <ScrollArea className="h-[100px] border rounded-md p-2">
                            <div className="grid grid-cols-2 gap-2">
                                {members.map((m: any) => (
                                    <div key={m.uid} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`mem-${m.uid}`} 
                                            checked={formData.assignedToIds.includes(m.uid)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setFormData({...formData, assignedToIds: [...formData.assignedToIds, m.uid]});
                                                else setFormData({...formData, assignedToIds: formData.assignedToIds.filter((id: string) => id !== m.uid)});
                                            }}
                                        />
                                        <label htmlFor={`mem-${m.uid}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{m.name}</label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="space-y-2 border-t pt-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="linkEvent" checked={formData.linkEvent} onCheckedChange={(c) => setFormData({...formData, linkEvent: !!c})} />
                            <label htmlFor="linkEvent" className="text-sm font-medium">Link to an Event</label>
                        </div>
                        {formData.linkEvent && (
                            <Select value={formData.linkedEventId} onValueChange={v => setFormData({...formData, linkedEventId: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Event" /></SelectTrigger>
                                <SelectContent>{events.map((e: any) => (<SelectItem key={e.id} value={e.id}>{e.eventName}</SelectItem>))}</SelectContent>
                            </Select>
                        )}
                    </div>
                    <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Details..." className="h-24" /></div>
                </div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button className="bg-[#1C4D8D]" onClick={handleSubmit}>{initialData ? "Save Changes" : "Create Task"}</Button></div>
            </DialogContent>
        </Dialog>
    );
}

function TaskDetailDialog({ open, onOpenChange, task, currentUser, studioId, onUpdate, onEdit, onDelete }: any) {
    const [note, setNote] = useState("");
    const [loadingNote, setLoadingNote] = useState(false);

    const handleSendNote = async () => {
        if (!note.trim()) return;
        setLoadingNote(true);
        try {
            await addWorkNote(studioId, task.id, note, currentUser);
            setNote("");
            onUpdate();
        } catch (e) { console.error(e); } finally { setLoadingNote(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-5 h-full">
                    
                    {/* LEFT: DETAILS PANEL */}
                    <div className="md:col-span-3 p-6 border-r overflow-y-auto bg-slate-50/30">
                        <DialogHeader className="mb-4 flex-row items-start justify-between space-y-0">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Badge className="uppercase tracking-wide">{task.status.replace('_', ' ')}</Badge>
                                    <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                                </div>
                                <DialogTitle className="text-2xl text-[#0F2854] leading-tight">{task.title}</DialogTitle>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={onEdit}><Edit className="w-4 h-4 text-slate-500 hover:text-blue-600"/></Button>
                                <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-slate-500 hover:text-red-600"/></Button>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="space-y-1"><Label className="text-xs text-slate-400 uppercase">Description</Label><p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description || "No description provided."}</p></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-xs text-slate-400 uppercase">Assignees</Label><div className="flex flex-wrap gap-1 mt-1">{task.assignedTo.map((u: any) => (<Badge key={u.uid} variant="secondary" className="text-xs bg-white border">{u.name}</Badge>))}</div></div>
                                <div><Label className="text-xs text-slate-400 uppercase">Due Date</Label><div className="text-sm font-medium mt-1">{task.dueDate ? format(safeDate(task.dueDate), "PPP") : "None"}</div></div>
                            </div>
                            {task.linkedEventName && (<div className="bg-blue-50 p-3 rounded-lg border border-blue-100"><Label className="text-xs text-blue-400 uppercase">Linked Event</Label><div className="text-sm font-medium text-blue-800 flex items-center gap-2 mt-1"><CalendarIcon className="w-4 h-4"/> {task.linkedEventName}</div></div>)}
                        </div>
                    </div>

                    {/* RIGHT: TIMELINE PANEL */}
                    <div className="md:col-span-2 flex flex-col h-full bg-white">
                        <div className="p-4 border-b bg-slate-50 font-medium text-sm text-slate-700">Work Log</div>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-6">
                                {task.workNotes && task.workNotes.length > 0 ? (task.workNotes.map((note: any) => (<div key={note.id} className="flex gap-3 text-sm"><Avatar className="h-8 w-8 mt-1"><AvatarFallback className="bg-blue-100 text-blue-600 text-xs">{note.userName.substring(0,2)}</AvatarFallback></Avatar><div className="flex-1 space-y-1"><div className="flex justify-between items-center"><span className="font-semibold text-slate-800">{note.userName}</span><span className="text-[10px] text-slate-400">{formatDistanceToNow(safeDate(note.timestamp), { addSuffix: true })}</span></div><p className="text-slate-600 bg-slate-50 p-2 rounded-lg rounded-tl-none">{note.message}</p></div></div>))) : (<div className="text-center text-slate-400 text-xs py-10">No notes yet.</div>)}
                            </div>
                        </ScrollArea>
                        <div className="p-3 border-t bg-slate-50"><div className="flex gap-2"><Input placeholder="Add a work note..." value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendNote()} className="bg-white" /><Button size="icon" onClick={handleSendNote} disabled={loadingNote || !note.trim()} className="shrink-0 bg-[#1C4D8D]">{loadingNote ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}</Button></div></div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}