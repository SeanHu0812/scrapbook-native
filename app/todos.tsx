import { useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from "react-native-draggable-flatlist";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Flag, Plus, GripVertical } from "lucide-react-native";
import { colors } from "@/theme/colors";

type TodoStatus = "done" | "planned" | "planning" | undefined;

type Todo = {
  _id: Id<"todos">;
  title: string;
  notes?: string;
  category: string;
  due?: string;
  done: boolean;
  status?: TodoStatus;
  sortOrder?: number;
  createdAt?: number;
};

const FILTERS = ["All", "Planned", "Planning", "Done"] as const;
type Filter = typeof FILTERS[number];

const STATUS_CONFIG: Record<NonNullable<TodoStatus>, { label: string; badge: string; text: string }> = {
  done:     { label: "Done",     badge: colors.coral, text: "#fff" },
  planned:  { label: "Planned",  badge: "#4CAF7D",    text: "#fff" },
  planning: { label: "Planning", badge: "#EDE9F8",    text: "#7C6CA8" },
};

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    const aDone = a.status === "done";
    const bDone = b.status === "done";
    if (aDone !== bDone) return aDone ? 1 : -1;
    const aOrder = a.sortOrder ?? a.createdAt ?? 0;
    const bOrder = b.sortOrder ?? b.createdAt ?? 0;
    return aOrder - bOrder;
  });
}

export default function TodosScreen() {
  const router = useRouter();

  const todos = useQuery(api.todos.list);
  const createTodo = useMutation(api.todos.create);
  const setStatusMutation = useMutation(api.todos.setStatus);
  const reorder = useMutation(api.todos.reorder);
  const updateTodo = useMutation(api.todos.update);
  const removeTodo = useMutation(api.todos.remove);

  const [filter, setFilter] = useState<Filter>("All");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const allTodos = sortTodos((todos ?? []) as Todo[]);

  const nonDonePool = allTodos.filter((t) => t.status !== "done");
  const donePool    = allTodos.filter((t) => t.status === "done");

  const draggableItems =
    filter === "All"      ? nonDonePool :
    filter === "Planned"  ? nonDonePool.filter((t) => t.status === "planned") :
    filter === "Planning" ? nonDonePool.filter((t) => t.status === "planning") :
                            [];

  const footerDoneItems =
    filter === "All"  ? donePool :
    filter === "Done" ? donePool :
                        [];

  function handleDragEnd({ data }: { data: Todo[] }) {
    reorder({ orderedIds: data.map((t) => t._id) });
  }

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createTodo({ title: newTitle.trim(), category: "home" });
      setNewTitle("");
      setAddModalVisible(false);
    } finally {
      setAdding(false);
    }
  }

  function openEdit(todo: Todo) {
    setEditTodo(todo);
    setEditTitle(todo.title);
    setEditNotes(todo.notes ?? "");
  }

  async function handleSave() {
    if (!editTodo || !editTitle.trim()) return;
    setSaving(true);
    try {
      await updateTodo({ id: editTodo._id, title: editTitle.trim(), notes: editNotes.trim() || undefined });
      setEditTodo(null);
    } finally {
      setSaving(false);
    }
  }

  function renderItem({ item, drag, isActive }: RenderItemParams<Todo>) {
    return (
      <ScaleDecorator activeScale={1.02}>
        <BucketItem
          todo={item}
          drag={drag}
          isActive={isActive}
          onSetStatus={(s) => setStatusMutation({ id: item._id, status: s })}
          onRemove={() => removeTodo({ id: item._id })}
          onEdit={() => openEdit(item)}
        />
      </ScaleDecorator>
    );
  }

  const isEmpty = draggableItems.length === 0 && footerDoneItems.length === 0;

  const listFooter = (
    <>
      {footerDoneItems.length > 0 && (
        <>
          <View style={styles.doneDivider}>
            <View style={styles.doneDividerLine} />
            <Text style={styles.doneDividerLabel}>Completed</Text>
            <View style={styles.doneDividerLine} />
          </View>
          {footerDoneItems.map((item) => (
            <BucketItem
              key={item._id as string}
              todo={item}
              onSetStatus={(s) => setStatusMutation({ id: item._id, status: s })}
              onRemove={() => removeTodo({ id: item._id })}
              onEdit={() => openEdit(item)}
            />
          ))}
        </>
      )}
      <View style={{ height: 120 }} />
    </>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={1.8} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Our Bucket List</Text>
          <Flag size={16} color={colors.coral} strokeWidth={1.8} />
        </View>
        <View style={styles.iconBtn} />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Draggable list (non-done only) + static done footer */}
      <DraggableFlatList
        data={draggableItems}
        keyExtractor={(item) => item._id as string}
        onDragEnd={handleDragEnd}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isEmpty ? (
            todos === undefined ? (
              <View style={styles.skeletonList}>
                {[1, 2, 3].map((i) => <View key={i} style={styles.skeletonCard} />)}
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>nothing here yet</Text>
                <Text style={styles.emptySubtitle}>
                  {filter === "All" ? "add your first adventure below ✈️" : "swipe an item to set its status"}
                </Text>
              </View>
            )
          ) : null
        }
        ListFooterComponent={listFooter}
      />

      {/* Fixed add button */}
      <View style={styles.addBtnWrap}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)} activeOpacity={0.9}>
          <Plus size={18} color="#fff" strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Add a Bucket List Item</Text>
        </TouchableOpacity>
      </View>

      {/* Add modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Adventure</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="What's the next adventure?"
              placeholderTextColor={colors.brown + "80"}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[styles.modalAddBtn, (!newTitle.trim() || adding) && styles.modalBtnDisabled]}
              onPress={handleAdd}
              disabled={adding || !newTitle.trim()}
            >
              {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalAddBtnText}>Add</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit modal */}
      <Modal visible={!!editTodo} transparent animationType="slide" onRequestClose={() => setEditTodo(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditTodo(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Adventure</Text>
            <TextInput
              style={styles.modalInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
              placeholderTextColor={colors.brown + "80"}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={[styles.modalInput, styles.modalInputNotes]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.brown + "80"}
              multiline
            />
            <TouchableOpacity
              style={[styles.modalAddBtn, (!editTitle.trim() || saving) && styles.modalBtnDisabled]}
              onPress={handleSave}
              disabled={saving || !editTitle.trim()}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalAddBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function BucketItem({
  todo, drag, isActive, onSetStatus, onRemove, onEdit,
}: {
  todo: Todo;
  drag?: () => void;
  isActive?: boolean;
  onSetStatus: (s: TodoStatus) => void;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  function act(fn: () => void) {
    swipeRef.current?.close();
    fn();
  }

  function renderRightActions() {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity style={[styles.swipeAction, styles.swipePlanning]} onPress={() => act(() => onSetStatus("planning"))}>
          <Text style={styles.swipeActionText}>Planning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.swipeAction, styles.swipePlanned]} onPress={() => act(() => onSetStatus("planned"))}>
          <Text style={styles.swipeActionText}>Planned</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.swipeAction, styles.swipeEdit]} onPress={() => act(onEdit)}>
          <Text style={styles.swipeActionText}>Edit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderLeftActions() {
    return (
      <TouchableOpacity style={styles.swipeDeleteAction} onPress={() => act(onRemove)}>
        <Text style={styles.swipeActionText}>Delete</Text>
      </TouchableOpacity>
    );
  }

  const cfg = todo.status ? STATUS_CONFIG[todo.status] : null;
  const isDone = todo.status === "done";

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
      enabled={!isActive}
    >
      <View style={[styles.itemCard, isDone && styles.itemCardDone]}>
        <TouchableOpacity
          style={[styles.checkbox, isDone && styles.checkboxDone]}
          onPress={() => onSetStatus(isDone ? undefined : "done")}
          activeOpacity={0.7}
        >
          {isDone && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={1}>{todo.title}</Text>
          {!!todo.notes && <Text style={styles.itemNotes} numberOfLines={1}>{todo.notes}</Text>}
          {!!todo.due && <Text style={styles.itemDue}>📅 {todo.due}</Text>}
        </View>

        {cfg && (
          <View style={[styles.statusBadge, { backgroundColor: cfg.badge }]}>
            <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        )}

        {drag && (
          <TouchableOpacity onLongPress={drag} delayLongPress={150} style={styles.dragHandle} hitSlop={8}>
            <GripVertical size={16} color={colors.brown + "60"} strokeWidth={1.5} />
          </TouchableOpacity>
        )}
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontFamily: "Caveat-Bold", fontSize: 26, color: colors.ink },

  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 14 },
  filterTab: {
    flex: 1, alignItems: "center",
    paddingVertical: 6, borderRadius: 100,
    backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  filterTabText: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown },
  filterTabTextActive: { color: "#fff", fontWeight: "600" },

  content: { paddingHorizontal: 20, paddingTop: 4 },

  itemCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.cream,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  itemCardDone: { opacity: 0.4 },

  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  checkboxDone: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "700" },

  itemContent: { flex: 1, gap: 3 },
  itemTitle: { fontFamily: "PatrickHand", fontSize: 17, fontWeight: "600", color: colors.ink },
  itemNotes: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "B3" },
  itemDue: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "80" },

  statusBadge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3, flexShrink: 0 },
  statusBadgeText: { fontFamily: "PatrickHand", fontSize: 12, fontWeight: "600" },

  dragHandle: { paddingLeft: 4, flexShrink: 0 },

  doneDivider: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  doneDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  doneDividerLabel: {
    fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "99",
    letterSpacing: 0.5, textTransform: "uppercase",
  },

  swipeDeleteAction: {
    backgroundColor: "#E85555", justifyContent: "center",
    alignItems: "center", paddingHorizontal: 24,
  },
  swipeActions: { flexDirection: "row" },
  swipeAction: { justifyContent: "center", alignItems: "center", paddingHorizontal: 16, minWidth: 72 },
  swipePlanning: { backgroundColor: "#7B9FD4" },
  swipePlanned:  { backgroundColor: "#4CAF7D" },
  swipeEdit:     { backgroundColor: colors.brown },
  swipeActionText: { fontFamily: "PatrickHand", fontSize: 13, fontWeight: "600", color: "#fff" },

  skeletonList: { gap: 10 },
  skeletonCard: { height: 52, borderRadius: 8, backgroundColor: colors.border },

  empty: { marginTop: 80, alignItems: "center", gap: 8 },
  emptyTitle: { fontFamily: "Caveat-Bold", fontSize: 28, color: colors.coral },
  emptySubtitle: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "99", textAlign: "center" },

  addBtnWrap: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    backgroundColor: colors.cream,
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.coral, borderRadius: 100, paddingVertical: 16,
    shadowColor: colors.coral, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40, shadowRadius: 16, elevation: 6,
  },
  addBtnText: { fontFamily: "PatrickHand", fontSize: 16, fontWeight: "600", color: "#fff" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, gap: 16,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: "center", marginBottom: 4,
  },
  modalTitle: { fontFamily: "Caveat-Bold", fontSize: 24, color: colors.ink },
  modalInput: {
    backgroundColor: colors.cream, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontFamily: "PatrickHand", fontSize: 16, color: colors.ink,
    borderWidth: 1, borderColor: colors.border,
  },
  modalInputNotes: { minHeight: 80, textAlignVertical: "top" },
  modalAddBtn: {
    backgroundColor: colors.coral, borderRadius: 100, paddingVertical: 14,
    alignItems: "center",
    shadowColor: colors.coral, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  modalBtnDisabled: { opacity: 0.5 },
  modalAddBtnText: { fontFamily: "PatrickHand", fontSize: 16, fontWeight: "600", color: "#fff" },
});
