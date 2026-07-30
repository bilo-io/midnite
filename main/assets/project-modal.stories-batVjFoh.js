import{aX as n,ay as R}from"./iframe-BdzmXRBy.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-mwNV7fcb.js";import{P as H}from"./project-modal-DnvfbH55.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Dof9r0oM.js";import"./Select-ef7c0426.esm-Bov4ErP-.js";import"./chevron-down-DdnTuzaW.js";import"./check-COfd7Wv3.js";import"./index-D7W3CuZ6.js";import"./triangle-alert-BogSl4AC.js";import"./export-menu-DZ0d2eXU.js";import"./client-C_bwRotb.js";import"./markdown-preview-DEfZmOWX.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CktG4LVx.js";import"./copy-Bc0QYBAM.js";import"./file-code-corner-BRsXyLcf.js";import"./loader-circle-Dao5Mlb7.js";import"./api-lqNS4KSy.js";import"./folder-open-C2QedANQ.js";import"./folder-Dev4FzW_.js";import"./tag-color-picker-Bn2oUrQt.js";import"./project-tag-CyiT5ZB1.js";import"./sparkles-DZsuFmpA.js";import"./brain-BE90fXeg.js";import"./chevron-right-D2XpZ68c.js";import"./markdown-editor-DAMWbE0v.js";import"./pencil-_m7qiXDO.js";import"./trash-2-CLs8-wth.js";import"./templates-Bv957Djx.js";import"./plus-D78sG67W.js";import"./task-row-BbCcg1br.js";import"./blocked-badge-CjwIR66k.js";import"./selectable-icon-DYktgI8S.js";import"./hover-expand-button-DG_QHLW3.js";import"./index-CYvqPcas.js";import"./data-refresh-CjqJc5-k.js";import"./rotate-ccw-ClNwogRZ.js";import"./play-CzFVinvr.js";import"./square-terminal-BGTzPd6m.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-mFZKZRSG.js";var s,c,p,m,l,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ha={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(l=o.parameters)===null||l===void 0||(m=l.docs)===null||m===void 0?void 0:m.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const fa=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,fa as __namedExportsOrder,ha as default};
