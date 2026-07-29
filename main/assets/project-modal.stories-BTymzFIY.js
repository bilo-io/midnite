import{aX as n,ay as R}from"./iframe-0PLg2Sxc.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DGmV7UaC.js";import{P as H}from"./project-modal-a3kvkBeY.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DKc4t3an.js";import"./Select-ef7c0426.esm-DpI0CE4g.js";import"./chevron-down-59r5Jc27.js";import"./check-D3yuw0HD.js";import"./index-CReanlQw.js";import"./triangle-alert-CQcXv1OG.js";import"./export-menu-bn_4xKIb.js";import"./client-9pxuw4hN.js";import"./markdown-preview-Bl2L9WxI.js";import"./index.dom-D_wTd2ti.js";import"./file-text-0-cLOGdU.js";import"./copy-BON6isI9.js";import"./file-code-corner-D69gpCTm.js";import"./loader-circle-DEmozjBY.js";import"./api-tv-dKvxb.js";import"./folder-open-BvL3WlnU.js";import"./folder-B9_aPdtI.js";import"./tag-color-picker-Q7sWPk_n.js";import"./project-tag-DOTLz2vQ.js";import"./sparkles-BUcqbzSh.js";import"./brain-CADsn5ut.js";import"./chevron-right-D5iuKwsb.js";import"./markdown-editor-Bi0V-ghb.js";import"./pencil-BndbynIC.js";import"./trash-2-BpoLXo7k.js";import"./templates-IsvrGNZJ.js";import"./plus-wo722B9Z.js";import"./task-row-Bo5U6Q9f.js";import"./i18n-labels-gJmEIQTh.js";import"./selectable-icon-Cl3afCAJ.js";import"./hover-expand-button-D6xibE9j.js";import"./index-Cgh9kRNY.js";import"./data-refresh-Ck6cQ5ac.js";import"./rotate-ccw-CQqkw2vR.js";import"./play-D56h1UzZ.js";import"./square-terminal-Cfx1Q-E8.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
