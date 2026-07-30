import{aX as n,ay as R}from"./iframe-mQAVYY6e.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-C0IVS_i6.js";import{P as H}from"./project-modal-DzI0oG0z.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DsJsThuq.js";import"./Select-ef7c0426.esm-B08OwgF5.js";import"./chevron-down-gnSZHF1I.js";import"./check-Cv313tEk.js";import"./index-lSV0Jy08.js";import"./triangle-alert-1MKz4Tp9.js";import"./export-menu-DsdWdPzP.js";import"./client-BcT9JcbT.js";import"./markdown-preview-BQrfGOdz.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DmYTIMAA.js";import"./copy-BJrUu9Ri.js";import"./file-code-corner-BOGSlydk.js";import"./loader-circle-DaGDuxZd.js";import"./api-CYD2ZLME.js";import"./folder-open-C-6AfWA1.js";import"./folder-BBjEUr51.js";import"./tag-color-picker-B325URiN.js";import"./project-tag-b6B7Zfpl.js";import"./sparkles-xo6XKmq9.js";import"./brain-v8OgC7h5.js";import"./chevron-right-8I76idX_.js";import"./markdown-editor-pV8emqV_.js";import"./pencil-Bi43fb34.js";import"./trash-2-DmHV7nsK.js";import"./templates-BFrOoukb.js";import"./plus-BfXrHvTs.js";import"./task-row-DEcK9Haz.js";import"./i18n-labels-0N__UToG.js";import"./selectable-icon-Bn4XnvBR.js";import"./hover-expand-button-DJQuJkNT.js";import"./index-B0mybRlo.js";import"./data-refresh-D9I9ZC5-.js";import"./rotate-ccw-MawB1HC9.js";import"./play-BYMLiG00.js";import"./square-terminal-BFV4jOfl.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
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
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
