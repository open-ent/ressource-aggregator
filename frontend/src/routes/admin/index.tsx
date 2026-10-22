import { useState } from "react";

import { Alert, Button, Modal } from "@open-ent/react";
import { useUser } from "@open-ent/react";
import { useTranslation } from "react-i18next";

import { MainLayout } from "~/components/main-layout/MainLayout";
import {
  useCreateFeaturedMutation,
  useCreateGlobalMutation,
  useDeleteFeaturedMutation,
  useDeleteGlobalMutation,
  useGetAdminFeaturedQuery,
  useGetAdminGlobalsQuery,
  useReindexGarMutation,
  useUpdateGlobalMutation,
} from "~/services/api/admin.service";
import {
  EMPTY_FEATURED_FORM,
  EMPTY_GLOBAL_FORM,
  featuredPayload,
  formFromGlobal,
  FeaturedForm,
  GLOBAL_PROFILES,
  GlobalResourceForm,
  globalPayload,
  validateFeaturedForm,
  validateGlobalForm,
} from "~/utils/adminResource.util";

import "~/styles/page/search.scss";

type Tab = "globals" | "featured" | "gar";

const isError = (res: unknown): boolean => !!res && typeof res === "object" && "error" in (res as object);

/**
 * Administration du médiacentre, réservée au super-administrateur : ressources globales (visibles par des profils),
 * ressources mises en avant, et réindexation des ressources GAR sans attendre la tâche planifiée.
 */
export const AdminPage: React.FC = () => {
  const { t } = useTranslation("mediacentre");
  const { user } = useUser();
  const isSuperAdmin = !!(user?.functions as Record<string, unknown> | undefined)?.SUPER_ADMIN;
  const [tab, setTab] = useState<Tab>("globals");

  return (
    <>
      <MainLayout />
      <div className="med-root-container">
        <div className="container py-24" style={{ maxWidth: 1100, marginLeft: 75 }}>
          <h1 className="h3">{t("mediacentre.admin.title")}</h1>
          {!isSuperAdmin ? (
            <Alert type="warning">{t("mediacentre.admin.forbidden")}</Alert>
          ) : (
            <>
              <div className="d-flex gap-8 my-16" role="tablist">
                {(["globals", "featured", "gar"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    className={`btn ${tab === id ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setTab(id)}
                    data-admin-tab={id}
                  >
                    {t(`mediacentre.admin.tab.${id}`)}
                  </button>
                ))}
              </div>
              {tab === "globals" && <GlobalsSection />}
              {tab === "featured" && <FeaturedSection />}
              {tab === "gar" && <GarSection />}
            </>
          )}
        </div>
      </div>
    </>
  );
};

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {children}
      {hint && <div className="form-text">{hint}</div>}
      {error && <div className="text-danger small">{error}</div>}
    </div>
  );
}

function GlobalsSection() {
  const { t } = useTranslation("mediacentre");
  const { data, isLoading, isError: failed } = useGetAdminGlobalsQuery();
  const [create, { isLoading: creating }] = useCreateGlobalMutation();
  const [update, { isLoading: updating }] = useUpdateGlobalMutation();
  const [remove] = useDeleteGlobalMutation();
  const [editing, setEditing] = useState<{ id: string | null; form: GlobalResourceForm } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const save = async () => {
    if (!editing) return;
    const found = validateGlobalForm(editing.form);
    setErrors(found);
    if (found.length > 0) return;
    const payload = globalPayload(editing.form);
    const res = editing.id ? await update({ id: editing.id, payload }) : await create(payload);
    if (isError(res)) {
      setMessage({ type: "danger", text: t("mediacentre.admin.save.error") });
      return;
    }
    setMessage({ type: "success", text: t("mediacentre.admin.global.saved") });
    setEditing(null);
  };

  const set = (patch: Partial<GlobalResourceForm>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });
  const err = (k: string) => (errors.includes(k) ? t(`mediacentre.admin.error.${k}`) : undefined);

  return (
    <section aria-labelledby="admin-globals">
      <div className="d-flex justify-content-between align-items-center mb-12">
        <h2 id="admin-globals" className="h5 mb-0">
          {t("mediacentre.admin.tab.globals")}
        </h2>
        <Button type="button" color="primary" variant="filled" onClick={() => { setErrors([]); setEditing({ id: null, form: EMPTY_GLOBAL_FORM }); }} data-admin-add-global>
          {t("mediacentre.admin.global.add")}
        </Button>
      </div>
      <p className="text-muted">{t("mediacentre.admin.global.hint")}</p>
      {message && <Alert type={message.type}>{message.text}</Alert>}
      {failed && <Alert type="danger">{t("mediacentre.admin.load.error")}</Alert>}
      {isLoading ? null : (data ?? []).length === 0 && !failed ? (
        <p className="text-muted">{t("mediacentre.admin.global.empty")}</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle" data-admin-globals>
            <thead>
              <tr>
                <th scope="col">{t("mediacentre.admin.field.title")}</th>
                <th scope="col">{t("mediacentre.admin.field.profiles")}</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r: any) => (
                <tr key={r._id ?? r.id} data-admin-global={r._id}>
                  <td>
                    <a href={r.link} target="_blank" rel="noreferrer noopener">
                      {r.title}
                    </a>
                  </td>
                  <td>{(r.profiles ?? []).map((p: string) => t(`mediacentre.admin.profile.${p}`)).join(", ")}</td>
                  <td className="text-end text-nowrap">
                    <Button type="button" size="sm" color="secondary" variant="outline" onClick={() => { setErrors([]); setEditing({ id: r._id, form: formFromGlobal(r) }); }} data-admin-edit-global>
                      {t("mediacentre.admin.edit")}
                    </Button>{" "}
                    <Button type="button" size="sm" color="danger" variant="outline" onClick={() => setConfirm({ id: r._id, title: r.title })} data-admin-delete-global>
                      {t("mediacentre.admin.delete")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal id="admin-global-form" isOpen size="lg" onModalClose={() => setEditing(null)}>
          <Modal.Header onModalClose={() => setEditing(null)}>
            {t(editing.id ? "mediacentre.admin.global.edit" : "mediacentre.admin.global.add")}
          </Modal.Header>
          <Modal.Body>
            <Field id="adm-title" label={t("mediacentre.admin.field.title")} error={err("title")}>
              <input id="adm-title" className="form-control" value={editing.form.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field id="adm-link" label={t("mediacentre.admin.field.link")} hint={t("mediacentre.admin.field.link.hint")} error={err("link")}>
              <input id="adm-link" className="form-control" value={editing.form.link} onChange={(e) => set({ link: e.target.value })} />
            </Field>
            <Field id="adm-image" label={t("mediacentre.admin.field.image")} hint={t("mediacentre.admin.field.image.hint")} error={err("image")}>
              <input id="adm-image" className="form-control" value={editing.form.image} onChange={(e) => set({ image: e.target.value })} />
            </Field>
            <Field id="adm-authors" label={t("mediacentre.admin.field.authors")} hint={t("mediacentre.admin.field.list.hint")}>
              <input id="adm-authors" className="form-control" value={editing.form.authors} onChange={(e) => set({ authors: e.target.value })} />
            </Field>
            <Field id="adm-editors" label={t("mediacentre.admin.field.editors")} hint={t("mediacentre.admin.field.list.hint")}>
              <input id="adm-editors" className="form-control" value={editing.form.editors} onChange={(e) => set({ editors: e.target.value })} />
            </Field>
            <fieldset className="mb-12">
              <legend className="form-label h6">{t("mediacentre.admin.field.profiles")}</legend>
              <div className="form-text mb-4">{t("mediacentre.admin.field.profiles.hint")}</div>
              {GLOBAL_PROFILES.map((p) => (
                <div key={p} className="form-check form-check-inline">
                  <input
                    id={`adm-profile-${p}`}
                    type="checkbox"
                    className="form-check-input"
                    checked={editing.form.profiles.includes(p)}
                    onChange={(e) => set({ profiles: e.target.checked ? [...editing.form.profiles, p] : editing.form.profiles.filter((x) => x !== p) })}
                  />
                  <label htmlFor={`adm-profile-${p}`} className="form-check-label">
                    {t(`mediacentre.admin.profile.${p}`)}
                  </label>
                </div>
              ))}
              {err("profiles") && <div className="text-danger small">{err("profiles")}</div>}
            </fieldset>
          </Modal.Body>
          <Modal.Footer>
            <Button color="tertiary" variant="ghost" onClick={() => setEditing(null)}>
              {t("mediacentre.admin.cancel")}
            </Button>
            <Button color="primary" variant="filled" disabled={creating || updating} onClick={save} data-admin-save-global>
              {t("mediacentre.admin.save")}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {confirm && (
        <Modal id="admin-global-delete" isOpen size="md" onModalClose={() => setConfirm(null)}>
          <Modal.Header onModalClose={() => setConfirm(null)}>{t("mediacentre.admin.delete")}</Modal.Header>
          <Modal.Body>
            <p className="mb-0">{t("mediacentre.admin.global.delete.confirm", { title: confirm.title })}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button color="tertiary" variant="ghost" onClick={() => setConfirm(null)}>
              {t("mediacentre.admin.cancel")}
            </Button>
            <Button
              color="danger"
              variant="filled"
              data-admin-delete-global-confirm
              onClick={async () => {
                const res = await remove(confirm.id);
                setMessage(isError(res) ? { type: "danger", text: t("mediacentre.admin.save.error") } : { type: "success", text: t("mediacentre.admin.global.deleted") });
                setConfirm(null);
              }}
            >
              {t("mediacentre.admin.delete")}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </section>
  );
}

function FeaturedSection() {
  const { t } = useTranslation("mediacentre");
  const { data, isLoading, isError: failed } = useGetAdminFeaturedQuery();
  const [create, { isLoading: creating }] = useCreateFeaturedMutation();
  const [remove] = useDeleteFeaturedMutation();
  const [form, setForm] = useState<FeaturedForm>(EMPTY_FEATURED_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const add = async () => {
    const found = validateFeaturedForm(form);
    setErrors(found);
    if (found.length > 0) return;
    const res = await create(featuredPayload(form));
    if (isError(res)) {
      setMessage({ type: "danger", text: t("mediacentre.admin.save.error") });
      return;
    }
    setMessage({ type: "success", text: t("mediacentre.admin.featured.saved") });
    setForm(EMPTY_FEATURED_FORM);
  };

  return (
    <section aria-labelledby="admin-featured">
      <h2 id="admin-featured" className="h5">
        {t("mediacentre.admin.tab.featured")}
      </h2>
      <p className="text-muted">{t("mediacentre.admin.featured.hint")}</p>
      {message && <Alert type={message.type}>{message.text}</Alert>}
      {failed && <Alert type="danger">{t("mediacentre.admin.load.error")}</Alert>}
      <div className="card p-16 mb-16">
        <div className="row g-12">
          <div className="col-12 col-md-4">
            <Field id="feat-id" label={t("mediacentre.admin.featured.resourceId")} hint={t("mediacentre.admin.featured.resourceId.hint")} error={errors.includes("resourceId") ? t("mediacentre.admin.error.resourceId") : undefined}>
              <input id="feat-id" className="form-control" value={form.resourceId} onChange={(e) => setForm({ ...form, resourceId: e.target.value })} />
            </Field>
          </div>
          <div className="col-12 col-md-4">
            <Field id="feat-source" label={t("mediacentre.admin.featured.source")} hint={t("mediacentre.admin.featured.source.hint")} error={errors.includes("source") ? t("mediacentre.admin.error.source") : undefined}>
              <input id="feat-source" className="form-control" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </Field>
          </div>
          <div className="col-12 col-md-4">
            <Field id="feat-module" label={t("mediacentre.admin.featured.module")} hint={t("mediacentre.admin.featured.module.hint")}>
              <input id="feat-module" className="form-control" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} />
            </Field>
          </div>
          <div className="col-12">
            <Field id="feat-desc" label={t("mediacentre.admin.featured.description")}>
              <input id="feat-desc" className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
        </div>
        <div>
          <Button type="button" color="primary" variant="filled" disabled={creating} onClick={add} data-admin-add-featured>
            {t("mediacentre.admin.featured.add")}
          </Button>
        </div>
      </div>
      {isLoading ? null : (data ?? []).length === 0 && !failed ? (
        <p className="text-muted">{t("mediacentre.admin.featured.empty")}</p>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle" data-admin-featured>
            <thead>
              <tr>
                <th scope="col">{t("mediacentre.admin.featured.resourceId")}</th>
                <th scope="col">{t("mediacentre.admin.featured.source")}</th>
                <th scope="col">{t("mediacentre.admin.featured.module")}</th>
                <th scope="col">{t("mediacentre.admin.featured.description")}</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r: any) => (
                <tr key={`${r.resourceId}-${r.module ?? ""}`} data-admin-featured-row={r.resourceId}>
                  <td>{r.resourceId}</td>
                  <td>{r.source}</td>
                  <td>{r.module}</td>
                  <td>{r.description}</td>
                  <td className="text-end">
                    <Button
                      type="button"
                      size="sm"
                      color="danger"
                      variant="outline"
                      data-admin-delete-featured
                      onClick={async () => {
                        const res = await remove(r.resourceId);
                        setMessage(isError(res) ? { type: "danger", text: t("mediacentre.admin.save.error") } : { type: "success", text: t("mediacentre.admin.featured.deleted") });
                      }}
                    >
                      {t("mediacentre.admin.delete")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function GarSection() {
  const { t } = useTranslation("mediacentre");
  const [reindex, { isLoading }] = useReindexGarMutation();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const run = async () => {
    setConfirm(false);
    const res = await reindex();
    const ok = !isError(res) && (res as { data?: { status?: string } }).data?.status === "ok";
    setMessage(ok ? { type: "success", text: t("mediacentre.admin.gar.started") } : { type: "danger", text: t("mediacentre.admin.gar.error") });
  };

  return (
    <section aria-labelledby="admin-gar">
      <h2 id="admin-gar" className="h5">
        {t("mediacentre.admin.tab.gar")}
      </h2>
      <p className="text-muted">{t("mediacentre.admin.gar.hint")}</p>
      {message && <Alert type={message.type}>{message.text}</Alert>}
      <Button type="button" color="primary" variant="filled" disabled={isLoading} onClick={() => setConfirm(true)} data-admin-reindex>
        {t("mediacentre.admin.gar.reindex")}
      </Button>
      {confirm && (
        <Modal id="admin-gar-confirm" isOpen size="md" onModalClose={() => setConfirm(false)}>
          <Modal.Header onModalClose={() => setConfirm(false)}>{t("mediacentre.admin.gar.reindex")}</Modal.Header>
          <Modal.Body>
            <p className="mb-0">{t("mediacentre.admin.gar.confirm")}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button color="tertiary" variant="ghost" onClick={() => setConfirm(false)}>
              {t("mediacentre.admin.cancel")}
            </Button>
            <Button color="primary" variant="filled" onClick={run} data-admin-reindex-confirm>
              {t("mediacentre.admin.gar.reindex")}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </section>
  );
}
