import{n as s,T as R}from"./iframe-CHRwHqqi.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-X8qDJQsO.js";import{P as H}from"./project-modal-Naq05mI_.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-C0uYzgnz.js";import"./index-BChqFaaU.js";import"./check-Cg3Vvtmi.js";import"./triangle-alert-DFJOWFE1.js";import"./export-menu-B7Z2J-Lv.js";import"./client-C4ZsJKQ2.js";import"./markdown-preview-DkOlzAk0.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Do17CwB6.js";import"./copy-CPf1KcOH.js";import"./file-code-corner-CDBJv2bL.js";import"./loader-circle-FKUCr74-.js";import"./api-BFzohKx1.js";import"./inbound-B2u08JBq.js";import"./folder-open-CekgH0P_.js";import"./folder-DUgQDHBU.js";import"./project-tag-DuzW5cf-.js";import"./tag-color-picker-BFo92uoz.js";import"./source-list-editor-Daq1LAWh.js";import"./source-icon-1C1dafSt.js";import"./globe-BQ2aMcfG.js";import"./sticky-note-DOBY7oDe.js";import"./plus-2jbku57u.js";import"./external-link-BEbhSDn_.js";import"./task-row-BaKOCOxk.js";import"./blocked-badge-Z7zorwry.js";import"./selectable-icon-DPdpz8XL.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-C2RzIRvL.js";import"./pencil-DAuCl7j1.js";import"./trash-2-L4-XB1Wu.js";import"./refresh-cw-DoU8Sb4u.js";import"./index-DkWdQ34z.js";import"./lightbulb-KAzjBIEm.js";import"./templates-B6M1OYb3.js";import"./sparkles-D4N2inJQ.js";import"./brain-BGBaTlpL.js";import"./chevron-right-B3lau6HX.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ha={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const fa=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,fa as __namedExportsOrder,ha as default};
