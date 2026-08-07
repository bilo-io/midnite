import{a_ as n,ax as R}from"./iframe-B6cRdJCM.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BDaediIW.js";import{P as H}from"./project-modal-BoMWbKTQ.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BipSqL2y.js";import"./Select-ef7c0426.esm-BH9cx8k0.js";import"./chevron-down-DweBmCCR.js";import"./check-C7pJxc8-.js";import"./export-menu-DT-BaZ-U.js";import"./client-DiRQJrAn.js";import"./markdown-preview-ff_J7qqL.js";import"./index.dom-D_wTd2ti.js";import"./copy-5BLt8naZ.js";import"./file-code-corner-D7FtTg1b.js";import"./file-text-Bc03BaXB.js";import"./loader-circle-DaWjWJgy.js";import"./api-BHtk7Id1.js";import"./folder-open-NbSdrTHa.js";import"./folder-FGQLJUSM.js";import"./tag-color-picker-ByAGGhyf.js";import"./project-tag-BBeJ_8ru.js";import"./sparkles-BTwB37ji.js";import"./brain-pu0lifYY.js";import"./chevron-right-B9ZNuUG7.js";import"./markdown-editor-BupmOr7c.js";import"./pencil-CqHWz4e9.js";import"./trash-2-MblEG_yZ.js";import"./templates-D1WPLEpr.js";import"./project-template-labels-DBpRnK1X.js";import"./plus-B-FK_vFL.js";import"./task-row-CIMTJHnB.js";import"./blocked-badge-ClgzRJqn.js";import"./selectable-icon-eA7jNt2M.js";import"./hover-expand-button-CuHGEGHg.js";import"./index-BnOW1lP7.js";import"./data-refresh-C-RJmF0E.js";import"./rotate-ccw-D0MhkyL2.js";import"./play-CEB3hd8A.js";import"./square-terminal-CggTgj4h.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-Cp-wysUh.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
