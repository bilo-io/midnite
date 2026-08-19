import{b0 as n,ax as R}from"./iframe-7xdydTgH.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BBVma7i5.js";import{P as H}from"./project-modal-C-3M8jDp.js";import"./preload-helper-Dp1pzeXC.js";import"./index-dCETeEyU.js";import"./Select-ef7c0426.esm-D63TH_iW.js";import"./chevron-down-D7WAugll.js";import"./check-38aLmfVG.js";import"./export-menu-D_25Hc7s.js";import"./client-Cu3nuY3P.js";import"./markdown-preview-CtD2EQOA.js";import"./index.dom-D_wTd2ti.js";import"./copy-CWufTt25.js";import"./file-code-corner-Dpxg4P3t.js";import"./file-text-kw9scVGo.js";import"./loader-circle-D8jr5t6O.js";import"./api-DFawzJ-3.js";import"./folder-open-qLbUxrgq.js";import"./folder-D_rBjznQ.js";import"./tag-color-picker-_vbWlUrW.js";import"./project-tag-DT3Sd9Ys.js";import"./sparkles-fX_vNheC.js";import"./brain-BTEcTqlY.js";import"./chevron-right-Ba6wtIJm.js";import"./markdown-editor-B0otZJhq.js";import"./pencil-2j83ktw2.js";import"./trash-2-Bj_rYX85.js";import"./templates-BbyHNWs-.js";import"./project-template-labels-BzE73GWp.js";import"./plus-xFQ9mX4z.js";import"./task-row-Clo4Kbpc.js";import"./blocked-badge-DGSws1AT.js";import"./selectable-icon-eaP_sKuN.js";import"./hover-expand-button-DSSgb5uq.js";import"./index-UbqSghmA.js";import"./data-refresh-D0_GIE56.js";import"./rotate-ccw-Doh_5tva.js";import"./play-CrFz0Qdb.js";import"./square-terminal-CZXiTfH_.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DZ19iQ5B.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
