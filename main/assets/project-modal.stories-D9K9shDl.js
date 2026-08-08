import{b0 as n,ax as R}from"./iframe-BUTs4p2n.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-B485z4O3.js";import{P as H}from"./project-modal-BuhYh6V3.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DN7i53wW.js";import"./Select-ef7c0426.esm-Dn8NC-WJ.js";import"./chevron-down-DpHboeLV.js";import"./check-D-2Oq7Gr.js";import"./export-menu-Dv3E_h-9.js";import"./client-nuVppoIi.js";import"./markdown-preview-_EesXvmw.js";import"./index.dom-D_wTd2ti.js";import"./copy-BdVj-bac.js";import"./file-code-corner-Cd4GwUdI.js";import"./file-text-CvnqNm_I.js";import"./loader-circle-IfP8nERF.js";import"./api-X8diawYb.js";import"./folder-open-BJFbj_2s.js";import"./folder-BXUI2i0b.js";import"./tag-color-picker-34ZqEFxX.js";import"./project-tag-BWrmyR63.js";import"./sparkles-D4cZgFKH.js";import"./brain-CjJT4Ku4.js";import"./chevron-right-DiMPu901.js";import"./markdown-editor-D4zP-D7o.js";import"./pencil-DtvMimfd.js";import"./trash-2-1omgziaQ.js";import"./templates-CC_QsQtn.js";import"./project-template-labels-CktM0gpf.js";import"./plus-DeLnmSeE.js";import"./task-row-CHWgXLLI.js";import"./blocked-badge-C78h_Z5x.js";import"./selectable-icon-BF__eBNR.js";import"./hover-expand-button-DfLyUoQF.js";import"./index-DVjzTIEI.js";import"./data-refresh-DvklCX-d.js";import"./rotate-ccw-DV7u0bmE.js";import"./play-Cjvy8J-N.js";import"./square-terminal-BELudxrR.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-LeaSkaf5.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
