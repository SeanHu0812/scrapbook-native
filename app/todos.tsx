import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Plus, Sparkles } from "lucide-react-native";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useSpace } from "@/lib/useSpace";
import { categoryLabels, type Category } from "@/constants/categories";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";

type Todo = {
  _id: Id<"todos">;
  title: string;
  notes?: string;
  category: Category;
  due?: string;
  done: boolean;
  assigneeId?: Id<"users">;
};

export default function TodosScreen() {
  const router = useRouter();
  const { status, members, currentUser } = useSpace();
  const isSolo = status === "solo";

  const todos = useQuery(api.todos.list);
  const createTodo = useMutation(api.todos.create);
  const toggleTodo = useMutation(api.todos.toggle);
  const removeTodo = useMutation(api.todos.remove);

  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const open = (todos ?? []).filter((t) => !t.done) as Todo[];
  const done = (todos ?? []).filter((t) => t.done) as Todo[];

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createTodo({ title: newTitle.trim(), category: "home" });
      setNewTitle("");
    } finally {
      setAdding(false);
    }
  }

  const headerTitle = isSolo
    ? "My little list"
    : `Our little list`;

  const membersLabel = isSolo
    ? (members[0]?.name ?? "just me")
    : `${members[0]?.name ?? ""} & ${members[1]?.name ?? ""}`;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Members card */}
        <View style={styles.membersCard}>
          <View style={styles.membersLeft}>
            {members[0] && (
              <UserAvatar
                name={members[0].name}
                avatarPreset={members[0].avatarPreset}
                avatarUrl={members[0].avatarUrl}
                size={36}
              />
            )}
            {members[1] && (
              <View style={{ marginLeft: -8 }}>
                <UserAvatar
                  name={members[1].name}
                  avatarPreset={members[1].avatarPreset}
                  avatarUrl={members[1].avatarUrl}
                  size={36}
                />
              </View>
            )}
            <Text style={styles.membersLabel}>{membersLabel}</Text>
          </View>
          <Text style={styles.countLabel}>
            {open.length} open · {done.length} done
          </Text>
        </View>

        {/* Add input */}
        <View style={styles.addRow}>
          <TouchableOpacity
            style={[styles.addBtn, (!newTitle.trim() || adding) && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={adding || !newTitle.trim()}
          >
            {adding
              ? <ActivityIndicator color="#fff" size="small" />
              : <Plus size={16} color="#fff" strokeWidth={2.5} />
            }
          </TouchableOpacity>
          <TextInput
            style={styles.addInput}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="add a little task..."
            placeholderTextColor={colors.brown + "80"}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
        </View>

        {/* Loading */}
        {todos === undefined ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : todos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>nothing here yet</Text>
            <Text style={styles.emptySubtitle}>add your first little task above ☁️</Text>
          </View>
        ) : (
          <>
            {/* To do */}
            {open.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>To do</Text>
                <View style={styles.todoList}>
                  {open.map((t) => (
                    <TodoRow
                      key={t._id as string}
                      todo={t}
                      onToggle={() => toggleTodo({ id: t._id })}
                      onRemove={() => removeTodo({ id: t._id })}
                      isSolo={isSolo}
                      members={members}
                      currentUserId={currentUser?._id as string | undefined}
                      onTurnIntoMemory={() =>
                        router.push(`/new?prefillTitle=${encodeURIComponent(t.title)}`)
                      }
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Done */}
            {done.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Done together</Text>
                <View style={styles.todoList}>
                  {done.map((t) => (
                    <TodoRow
                      key={t._id as string}
                      todo={t}
                      onToggle={() => toggleTodo({ id: t._id })}
                      onRemove={() => removeTodo({ id: t._id })}
                      completed
                      isSolo={isSolo}
                      members={members}
                      currentUserId={currentUser?._id as string | undefined}
                      onTurnIntoMemory={() =>
                        router.push(`/new?prefillTitle=${encodeURIComponent(t.title)}`)
                      }
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Todo row ──────────────────────────────────────────────────────────────────

function TodoRow({
  todo, onToggle, onRemove, completed = false,
  isSolo, members, currentUserId, onTurnIntoMemory,
}: {
  todo: Todo;
  onToggle: () => void;
  onRemove: () => void;
  completed?: boolean;
  isSolo: boolean;
  members: { userId?: string; name: string; avatarPreset?: string | null; avatarUrl?: string | null }[];
  currentUserId?: string;
  onTurnIntoMemory: () => void;
}) {
  const cat = categoryLabels[todo.category] ?? categoryLabels.home;
  const assigneeMember = todo.assigneeId
    ? members.find((m) => m.userId === (todo.assigneeId as string))
    : null;
  const assigneeLabel = !todo.assigneeId
    ? "us"
    : todo.assigneeId === currentUserId
      ? "you"
      : (assigneeMember?.name ?? "them");

  return (
    <View style={[styles.todoCard, completed && styles.todoCardDone]}>
      <View style={styles.todoRow}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[styles.checkbox, todo.done && styles.checkboxDone]}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          {todo.done && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.todoContent}>
          <Text style={[styles.todoTitle, todo.done && styles.todoTitleDone]}>
            {todo.title}
          </Text>
          {!!todo.notes && (
            <Text style={styles.todoNotes} numberOfLines={1}>{todo.notes}</Text>
          )}

          {/* Chips row */}
          <View style={styles.chipsRow}>
            {/* Category */}
            <View style={[styles.chip, { backgroundColor: cat.bg }]}>
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={styles.chipText}>{cat.label}</Text>
            </View>

            {/* Due date */}
            {!!todo.due && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>📅 {todo.due}</Text>
              </View>
            )}

            {/* Assignee */}
            <View style={styles.chip}>
              {assigneeMember && (
                <UserAvatar
                  name={assigneeMember.name}
                  avatarPreset={assigneeMember.avatarPreset}
                  avatarUrl={assigneeMember.avatarUrl}
                  size={14}
                />
              )}
              <Text style={styles.chipText}>{assigneeLabel}</Text>
            </View>

            {/* Turn into memory */}
            {completed && (
              <TouchableOpacity
                style={[styles.chip, styles.chipMemory]}
                onPress={onTurnIntoMemory}
                activeOpacity={0.8}
              >
                <Sparkles size={10} color={colors.coral} strokeWidth={2} />
                <Text style={[styles.chipText, { color: colors.coral }]}>Turn into memory</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border + "60",
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  membersCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 12, ...(shadows.paper as object),
  },
  membersLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  membersLabel: { fontFamily: "PatrickHand", fontSize: 15, color: colors.ink, marginLeft: 4 },
  countLabel: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "B3" },

  addRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 20, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 24,
  },
  addBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.pink,
    alignItems: "center", justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.5 },
  addInput: { flex: 1, fontFamily: "PatrickHand", fontSize: 14, color: colors.ink },

  skeletonList: { gap: 10 },
  skeletonCard: { height: 64, borderRadius: 20, backgroundColor: colors.border },

  empty: { marginTop: 64, alignItems: "center", gap: 8 },
  emptyTitle: { fontFamily: "Caveat-Bold", fontSize: 28, color: colors.coral },
  emptySubtitle: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "99" },

  section: { gap: 10, marginBottom: 24 },
  sectionLabel: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.brown + "CC" },
  todoList: { gap: 8 },

  todoCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 14,
    ...(shadows.paper as object),
  },
  todoCardDone: { opacity: 0.6 },
  todoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: colors.brown + "66", marginTop: 1,
    alignItems: "center", justifyContent: "center",
  },
  checkboxDone: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "700", lineHeight: 16 },

  todoContent: { flex: 1, gap: 4 },
  todoTitle: { fontFamily: "PatrickHand", fontSize: 15, color: colors.ink, lineHeight: 20 },
  todoTitleDone: { textDecorationLine: "line-through", color: colors.brown },
  todoNotes: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "99" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  chipEmoji: { fontSize: 11 },
  chipText: { fontFamily: "PatrickHand", fontSize: 11, fontWeight: "600", color: colors.brown },
  chipMemory: { borderColor: colors.pink + "80", backgroundColor: colors.pinkSoft },
});
