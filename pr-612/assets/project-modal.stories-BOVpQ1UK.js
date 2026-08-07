import{a$ as n,aw as R}from"./iframe-5iSBvXHs.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BXeDPYsr.js";import{P as H}from"./project-modal-kMT32e66.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Ddn9-9p2.js";import"./Select-ef7c0426.esm-Calr44xm.js";import"./chevron-down-Djz-wnIw.js";import"./check-DpiLD8QB.js";import"./export-menu-CwmIZsml.js";import"./client-CdkhHEU7.js";import"./markdown-preview-YhWXOeBC.js";import"./index.dom-D_wTd2ti.js";import"./copy-CDFtb00z.js";import"./file-code-corner-CwZQpUy8.js";import"./file-text-BTC6Uq7p.js";import"./loader-circle-kyciGKvW.js";import"./api-DOLpnmb2.js";import"./folder-open-LMOH3lGA.js";import"./folder-CMySrUh_.js";import"./tag-color-picker-CigLN9GK.js";import"./project-tag-BKhYTXzI.js";import"./sparkles-BDaz-Iv1.js";import"./brain-DwtOvtFD.js";import"./chevron-right-CM0XqZYr.js";import"./markdown-editor-Bzu2kv2Z.js";import"./pencil-00-e9Dzp.js";import"./trash-2-BQS6tqvH.js";import"./templates-DmXrIpIB.js";import"./project-template-labels-eb7C3fxi.js";import"./plus-CaOpDcUi.js";import"./task-row-DCE_zgrv.js";import"./blocked-badge-DtGrFBuh.js";import"./selectable-icon-CGodc5Hb.js";import"./hover-expand-button-jUJItRzM.js";import"./index-WyMqQgUO.js";import"./data-refresh-D-ZQFTFv.js";import"./rotate-ccw-DEJbry5l.js";import"./play-CYxYhIYz.js";import"./square-terminal-Zr_HXhG3.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-_kAhAeuj.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
