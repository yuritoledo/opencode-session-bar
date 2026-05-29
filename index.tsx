/** @jsxImportSource @opentui/solid */
import { createResource, createSignal, For, Show } from "solid-js"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"

function View(props: { api: TuiPluginApi; sessionID: string }) {
  const theme = () => props.api.theme.current
  const [deleting, setDeleting] = createSignal<Set<string>>(new Set())

    const [sessions, { refetch }] = createResource(async () => {
    const res = await props.api.client.session.list()
    return (res.data ?? []) as Array<{ id: string; title: string; time: { created: number; updated: number } }>
  })

  async function handleSwitch(id: string) {
    props.api.route.navigate("session", { sessionID: id })
  }

  async function handleDelete(id: string) {
    setDeleting(prev => new Set(prev).add(id))
    try {
      await props.api.client.session.delete({ path: { id } })
      refetch()
    } catch {
      props.api.ui.toast({ variant: "error", message: "Failed to delete session" })
    } finally {
      setDeleting(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  const sorted = () => (sessions() ?? [])
    .slice()
    .sort((a, b) => b.time.updated - a.time.updated)

  return (
    <box>
      <text fg={theme().text}>Sessions</text>
      <Show when={sessions.loading}>
        <text fg={theme().textMuted}>loading...</text>
      </Show>
      <For each={sorted()}>
        {(session) => {
          const active = session.id === props.sessionID
          const isDeleting = deleting().has(session.id)
          return (
            <box flexDirection="row" gap={1}>
              <text
                fg={active ? theme().accent : theme().text}
                attributes={{ bold: active }}
                onMouseDown={() => !active && handleSwitch(session.id)}
              >
                {active ? ">" : " "} {session.title}
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
