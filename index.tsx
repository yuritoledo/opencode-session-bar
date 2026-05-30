/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { createResource, createSignal, For, onCleanup, onMount, Show } from "solid-js";

function View(props: { api: TuiPluginApi; sessionID: string }) {
  const theme = () => props.api.theme.current
  const [deleting, setDeleting] = createSignal<Set<string>>(new Set())

  const [sessions, { refetch }] = createResource(async () => {
    const res = await props.api.client.session.list()
    return (res.data ?? []) as Array<{ id: string; title: string; time: { created: number; updated: number } }>
  })

  const sorted = () => (sessions() ?? [])
    .slice()
    .sort((a, b) => b.time.updated - a.time.updated)

  async function handleSwitch(id: string) {
    props.api.route.navigate("session", { sessionID: id })
  }

  async function handleDelete(id: string) {
    setDeleting(prev => new Set(prev).add(id))
    try {
      await props.api.client.session.delete({ sessionID: id })
      refetch()
    } catch {
      props.api.ui.toast({ variant: "error", message: "Failed to delete session" })
    } finally {
      setDeleting(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }
  onMount(() => {
    const unsub1 = props.api.event.on("session.updated", () => refetch())
    const unsub2 = props.api.event.on("session.deleted", () => refetch())
    const unsub3 = props.api.event.on("session.created", () => refetch())
    onCleanup(() => { unsub1(); unsub2(); unsub3() })
  })

  return (
    <box>
      <text fg={theme().text}>
        <strong>Latest sessions</strong>
      </text>
      <Show when={sessions.loading}>
        <text fg={theme().textMuted}>loading...</text>
      </Show>
      <box>
        <For each={sorted()}>
          {(session) => {
            const isDeleting = deleting().has(session.id)
            return (
              <box flexDirection="row" justifyContent="space-between" overflow="hidden">
                <text
                  fg={theme().textMuted}
                  flexGrow={1}
                >
                  {session.title.slice(0, 30)}
                </text>
                <Show when={!isDeleting}>
                  <text
                    fg={theme().textMuted}
                    onMouseDown={() => handleDelete(session.id)}
                  >
                    [x]
                  </text>
                </Show>
                <Show when={isDeleting}>
                  <text fg={theme().textMuted}>...</text>
                </Show>
              </box>
            )
          }}
        </For>
      </box>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 40,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} sessionID={props.session_id} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "opencode-session-bar",
  tui,
}

export default plugin
