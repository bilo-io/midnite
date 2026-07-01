import{n as s,T as R}from"./iframe-DaFpXuLo.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-BMMha0wM.js";import{P as H}from"./project-modal-DhLI0R1z.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-4revDPTH.js";import"./index-BIqGwvxJ.js";import"./check-Dfikfxea.js";import"./triangle-alert-V-tzDSzj.js";import"./export-menu-gt7mW7rQ.js";import"./client-D25Qz556.js";import"./markdown-preview-D62BZyaz.js";import"./file-text-CB-qH1qb.js";import"./copy-ql5Ruq47.js";import"./loader-circle-67sVKpFB.js";import"./api-CAvxGH1b.js";import"./webhook-Ddo3p-Ag.js";import"./folder-open-CtWbke-q.js";import"./folder-Cph98anW.js";import"./project-tag-Bq9dRGyd.js";import"./tag-color-picker-CFE-KGWe.js";import"./source-list-editor-CtpHi2mv.js";import"./source-icon-WF7duqan.js";import"./globe-Ci6OAo19.js";import"./sticky-note-DQ22UFRB.js";import"./plus-p57Y1lYd.js";import"./external-link-DKZNkqVm.js";import"./task-row-DgIqo2qz.js";import"./blocked-badge-B8OHJ5dg.js";import"./selectable-icon-Ctst60FZ.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-SL8kxFtM.js";import"./pencil-C67ZWaIl.js";import"./trash-2-BzJV2l1C.js";import"./refresh-cw-DvkxuIHG.js";import"./index-XOONAkvl.js";import"./lightbulb-BAvX8ajC.js";import"./templates-B6M1OYb3.js";import"./sparkles-DPucNEKl.js";import"./brain-li9-afg4.js";import"./chevron-right-KEu7gHIl.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(m=d.docs)===null||m===void 0?void 0:m.description}}};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=r.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=r.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(g=i.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const sourcesTab = within(dialog).getByRole('tab', {
      name: /sources/i
    });
    await userEvent.click(sourcesTab);
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ja=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,ja as __namedExportsOrder,ba as default};
